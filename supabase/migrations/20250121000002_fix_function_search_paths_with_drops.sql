-- Fix search path security issues for all functions
-- This adds explicit search_path to all functions that were missing it
-- Dropping existing functions first to handle return type conflicts

-- Drop existing functions that need to be recreated
DROP FUNCTION IF EXISTS public.get_list_with_places_details(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_disliked_places(uuid);
DROP FUNCTION IF EXISTS public.get_google_places_within_radius(numeric, numeric, numeric, integer);
DROP FUNCTION IF EXISTS public.get_user_recommendation_preferences(uuid);
DROP FUNCTION IF EXISTS public.get_user_list_summaries(uuid);
DROP FUNCTION IF EXISTS public.get_place_feedback_stats(text);
DROP FUNCTION IF EXISTS public.clear_user_recommendation_feedback(uuid);
DROP FUNCTION IF EXISTS public.get_user_preference_patterns(uuid);
DROP FUNCTION IF EXISTS public.get_user_lists_with_places(uuid);
DROP FUNCTION IF EXISTS public.upsert_user_recommendation_preferences(uuid, jsonb);

-- 1. Recreate get_list_with_places_details
CREATE OR REPLACE FUNCTION public.get_list_with_places_details(list_id_param uuid, user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  result JSON;
BEGIN
  -- Build the complete list data with places in a single query
  SELECT json_build_object(
    'id', l.id,
    'user_id', l.user_id,
    'name', l.name,
    'auto_generated', l.auto_generated,
    'visibility', l.visibility,
    'description', l.description,
    'list_type', l.list_type,
    'icon', l.icon,
    'color', l.color,
    'type', l.type,
    'is_default', l.is_default,
    'default_list_type', l.default_list_type,
    'is_curated', l.is_curated,
    'publisher_name', l.publisher_name,
    'publisher_logo_url', l.publisher_logo_url,
    'external_link', l.external_link,
    'location_scope', l.location_scope,
    'curator_priority', l.curator_priority,
    'created_at', l.created_at,
    'updated_at', l.updated_at,
    'places', COALESCE(
      json_agg(
        CASE 
          WHEN lp.place_id IS NOT NULL THEN
            json_build_object(
              'list_id', lp.list_id,
              'place_id', lp.place_id,
              'added_at', lp.added_at,
              'notes', lp.notes,
              'personal_rating', lp.personal_rating,
              'visit_count', lp.visit_count,
              'sort_order', lp.sort_order,
              'place', json_build_object(
                'google_place_id', ep.google_place_id,
                'name', ep.name,
                'formatted_address', ep.formatted_address,
                'geometry', ep.geometry,
                'types', ep.types,
                'rating', ep.rating,
                'price_level', ep.price_level,
                'formatted_phone_number', ep.formatted_phone_number,
                'website', ep.website,
                'opening_hours', ep.opening_hours,
                'photo_urls', ep.photo_urls,
                'primary_image_url', ep.primary_image_url,
                'display_description', ep.display_description,
                'is_featured', ep.is_featured,
                'has_editorial_content', ep.has_editorial_content,
                'business_status', ep.business_status
              )
            )
          ELSE NULL
        END
        ORDER BY lp.sort_order ASC, lp.added_at DESC
      ) FILTER (WHERE lp.place_id IS NOT NULL AND (ep.business_status = 'OPERATIONAL' OR ep.business_status IS NULL)),
      '[]'::json
    ),
    'place_count', COUNT(lp.place_id) FILTER (WHERE ep.business_status = 'OPERATIONAL' OR ep.business_status IS NULL)
  ) INTO result
  FROM lists l
  LEFT JOIN list_places lp ON l.id = lp.list_id
  LEFT JOIN enriched_places ep ON lp.place_id = ep.google_place_id
  WHERE l.id = list_id_param
    AND (l.user_id = user_id_param OR l.is_curated = true)
  GROUP BY l.id;

  -- Return null if list not found or user doesn't have access
  IF result IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN result;
END;
$function$;

-- 2. Recreate get_user_disliked_places
CREATE OR REPLACE FUNCTION public.get_user_disliked_places(p_user_id uuid)
RETURNS TABLE(google_place_id text)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        ri.google_place_id
    FROM recommendation_instances ri
    JOIN recommendation_feedback rf ON ri.id = rf.recommendation_instance_id
    WHERE ri.user_id = p_user_id
      AND rf.feedback_type = 'disliked'
      AND rf.created_at > NOW() - INTERVAL '30 days';
END;
$function$;

-- 3. Recreate get_google_places_within_radius
CREATE OR REPLACE FUNCTION public.get_google_places_within_radius(
    lat numeric,
    lng numeric,
    radius_meters numeric DEFAULT 1000,
    limit_count integer DEFAULT 50
)
RETURNS TABLE(
    google_place_id text,
    name text,
    formatted_address text,
    geometry jsonb,
    types text[],
    rating numeric,
    user_ratings_total integer,
    price_level integer,
    opening_hours jsonb,
    photo_urls text[],
    distance_meters numeric
)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        gpc.google_place_id,
        gpc.name,
        gpc.formatted_address,
        gpc.geometry,
        gpc.types,
        gpc.rating,
        gpc.user_ratings_total,
        gpc.price_level,
        gpc.opening_hours,
        gpc.photo_urls,
        ST_Distance(
            ST_Transform(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 3857),
            ST_Transform(ST_SetSRID(ST_MakePoint(
                (gpc.geometry->>'lng')::numeric,
                (gpc.geometry->>'lat')::numeric
            ), 4326), 3857)
        ) AS distance_meters
    FROM google_places_cache gpc
    WHERE ST_DWithin(
        ST_Transform(ST_SetSRID(ST_MakePoint(
            (gpc.geometry->>'lng')::numeric,
            (gpc.geometry->>'lat')::numeric
        ), 4326), 3857),
        ST_Transform(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 3857),
        radius_meters
    )
    AND gpc.expires_at > NOW()
    AND (gpc.business_status = 'OPERATIONAL' OR gpc.business_status IS NULL)
    ORDER BY distance_meters ASC
    LIMIT limit_count;
END;
$function$;

-- 4. Recreate get_user_recommendation_preferences
CREATE OR REPLACE FUNCTION public.get_user_recommendation_preferences(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
DECLARE
    v_preferences jsonb;
BEGIN
    SELECT preferences INTO v_preferences
    FROM user_recommendation_preferences
    WHERE user_id = p_user_id;
    
    -- Return default preferences if user has none set
    IF v_preferences IS NULL THEN
        v_preferences := '{"food": true, "coffee": true, "work": true}'::jsonb;
    END IF;
    
    RETURN v_preferences;
END;
$function$;

-- 5. Recreate get_user_list_summaries
CREATE OR REPLACE FUNCTION public.get_user_list_summaries(user_uuid uuid)
RETURNS TABLE(
    id uuid,
    name text,
    icon text,
    color text,
    place_count bigint,
    is_default boolean,
    default_list_type text,
    last_place_added timestamp with time zone
)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ulwc.id,
        ulwc.name,
        ulwc.icon,
        ulwc.color,
        ulwc.place_count,
        ulwc.is_default,
        ulwc.list_type as default_list_type,
        ulwc.last_place_added
    FROM user_lists_with_counts ulwc
    WHERE ulwc.user_id = user_uuid
    ORDER BY 
        ulwc.is_default DESC,
        ulwc.last_place_added DESC NULLS LAST,
        ulwc.created_at DESC;
END;
$function$;

-- 6. Recreate get_place_feedback_stats
CREATE OR REPLACE FUNCTION public.get_place_feedback_stats(p_google_place_id text)
RETURNS TABLE(
    total_recommendations bigint,
    likes bigint,
    dislikes bigint,
    views bigint
)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT ri.id) as total_recommendations,
        COUNT(DISTINCT CASE WHEN rf.feedback_type = 'liked' THEN rf.id END) as likes,
        COUNT(DISTINCT CASE WHEN rf.feedback_type = 'disliked' THEN rf.id END) as dislikes,
        COUNT(DISTINCT CASE WHEN rf.feedback_type = 'viewed' THEN rf.id END) as views
    FROM recommendation_instances ri
    LEFT JOIN recommendation_feedback rf ON ri.id = rf.recommendation_instance_id
    WHERE ri.google_place_id = p_google_place_id;
END;
$function$;

-- 7. Recreate clear_user_recommendation_feedback
CREATE OR REPLACE FUNCTION public.clear_user_recommendation_feedback(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
    -- Delete all feedback for this user's recommendations
    DELETE FROM recommendation_feedback
    WHERE recommendation_instance_id IN (
        SELECT ri.id
        FROM recommendation_instances ri
        WHERE ri.user_id = p_user_id
    );
    
    -- Delete all recommendation instances for this user
    DELETE FROM recommendation_instances
    WHERE user_id = p_user_id;
    
    -- Delete all recommendation requests for this user
    DELETE FROM recommendation_requests
    WHERE user_id = p_user_id;
END;
$function$;

-- 8. Recreate get_user_preference_patterns
CREATE OR REPLACE FUNCTION public.get_user_preference_patterns(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
DECLARE
    v_patterns jsonb;
BEGIN
    WITH liked_places AS (
        SELECT 
            gpc.types,
            gpc.price_level,
            gpc.rating
        FROM recommendation_feedback rf
        JOIN recommendation_instances ri ON rf.recommendation_instance_id = ri.id
        JOIN google_places_cache gpc ON ri.google_place_id = gpc.google_place_id
        WHERE ri.user_id = p_user_id
          AND rf.feedback_type = 'liked'
    ),
    type_preferences AS (
        SELECT 
            unnest(types) as place_type,
            COUNT(*) as count
        FROM liked_places
        GROUP BY place_type
        ORDER BY count DESC
        LIMIT 10
    ),
    price_preferences AS (
        SELECT 
            price_level,
            COUNT(*) as count
        FROM liked_places
        WHERE price_level IS NOT NULL
        GROUP BY price_level
    ),
    rating_preferences AS (
        SELECT 
            AVG(rating) as avg_rating,
            MIN(rating) as min_rating
        FROM liked_places
        WHERE rating IS NOT NULL
    )
    SELECT jsonb_build_object(
        'preferred_types', (SELECT jsonb_agg(place_type) FROM type_preferences),
        'price_distribution', (SELECT jsonb_object_agg(price_level, count) FROM price_preferences),
        'min_preferred_rating', (SELECT COALESCE(min_rating, 4.0) FROM rating_preferences),
        'avg_preferred_rating', (SELECT COALESCE(avg_rating, 4.5) FROM rating_preferences)
    ) INTO v_patterns;
    
    RETURN COALESCE(v_patterns, '{}'::jsonb);
END;
$function$;

-- 9. Recreate get_user_lists_with_places
CREATE OR REPLACE FUNCTION public.get_user_lists_with_places(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', lists_data.id,
      'name', lists_data.name,
      'description', lists_data.description,
      'list_type', lists_data.list_type,
      'icon', lists_data.icon,
      'color', lists_data.color,
      'type', lists_data.type,
      'is_default', lists_data.is_default,
      'auto_generated', lists_data.auto_generated,
      'visibility', lists_data.visibility,
      'created_at', lists_data.created_at,
      'updated_at', lists_data.updated_at,
      'place_count', lists_data.place_count,
      'last_place_added', lists_data.last_place_added,
      'places', lists_data.places
    ) ORDER BY lists_data.is_default DESC, lists_data.created_at DESC
  ) INTO result
  FROM (
    SELECT 
      l.*,
      COALESCE(place_counts.place_count, 0) AS place_count,
      place_counts.last_place_added,
      COALESCE(places_data.places, '[]'::json) AS places
    FROM lists l
    LEFT JOIN (
      SELECT 
        list_id,
        COUNT(*) AS place_count,
        MAX(added_at) AS last_place_added
      FROM list_places
      GROUP BY list_id
    ) place_counts ON l.id = place_counts.list_id
    LEFT JOIN (
      SELECT 
        lp.list_id,
        json_agg(
          json_build_object(
            'list_place_id', lp.id,
            'place_id', lp.place_id,
            'added_at', lp.added_at,
            'notes', lp.notes,
            'personal_rating', lp.personal_rating,
            'visit_count', lp.visit_count,
            'sort_order', lp.sort_order,
            'place', json_build_object(
              'google_place_id', gpc.google_place_id,
              'name', gpc.name,
              'formatted_address', gpc.formatted_address,
              'types', gpc.types,
              'rating', gpc.rating,
              'photo_urls', gpc.photo_urls
            )
          ) ORDER BY lp.sort_order ASC, lp.added_at DESC
        ) AS places
      FROM list_places lp
      JOIN google_places_cache gpc ON lp.place_id = gpc.google_place_id
      WHERE gpc.expires_at > NOW()
      GROUP BY lp.list_id
    ) places_data ON l.id = places_data.list_id
    WHERE l.user_id = user_uuid
  ) lists_data;

  RETURN COALESCE(result, '[]'::json);
END;
$function$;

-- 10. Recreate upsert_user_recommendation_preferences
CREATE OR REPLACE FUNCTION public.upsert_user_recommendation_preferences(
    p_user_id uuid,
    p_preferences jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
    INSERT INTO user_recommendation_preferences (user_id, preferences)
    VALUES (p_user_id, p_preferences)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        preferences = EXCLUDED.preferences,
        updated_at = NOW();
END;
$function$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully updated 10 functions with explicit search_path settings';
END $$;