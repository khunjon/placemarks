-- Drop and recreate views to ensure they don't have SECURITY DEFINER
-- This migration ensures a clean state for all views reported by the security advisor

-- 1. Drop all views that were reported as having SECURITY DEFINER
DROP VIEW IF EXISTS enriched_check_ins CASCADE;
DROP VIEW IF EXISTS user_lists_with_counts CASCADE;
DROP VIEW IF EXISTS enriched_list_places CASCADE;
DROP VIEW IF EXISTS google_places_cache_valid CASCADE;
DROP VIEW IF EXISTS enriched_places CASCADE;

-- 2. Recreate enriched_check_ins view
CREATE VIEW enriched_check_ins AS
SELECT 
    ci.id,
    ci.user_id,
    ci.place_id,
    ci.timestamp,
    ci.rating,
    ci.notes,
    ci.comment,
    ci.photos,
    ci.tags,
    ci.context,
    ci.weather_context,
    ci.companion_type,
    ci.meal_type,
    ci.transportation_method,
    ci.visit_duration,
    ci.would_return,
    ci.created_at,
    ci.updated_at,
    gpc.google_place_id,
    gpc.name AS place_name,
    gpc.formatted_address AS place_address,
    gpc.types AS google_types,
    gpc.rating AS google_rating,
    gpc.formatted_phone_number AS place_phone,
    gpc.website AS place_website,
    gpc.opening_hours AS hours_open,
    gpc.photo_urls AS place_photos
FROM check_ins ci
JOIN google_places_cache gpc ON ci.place_id = gpc.google_place_id;

-- 3. Recreate user_lists_with_counts view
CREATE VIEW user_lists_with_counts AS
SELECT 
    l.id,
    l.user_id,
    l.name,
    l.description,
    l.list_type,
    l.icon,
    l.color,
    l.type,
    l.is_default,
    l.auto_generated,
    l.visibility,
    l.created_at,
    COALESCE(place_counts.place_count, 0::bigint) AS place_count,
    COALESCE(place_counts.last_added, NULL::timestamp with time zone) AS last_place_added
FROM lists l
LEFT JOIN (
    SELECT 
        list_places.list_id,
        count(*) AS place_count,
        max(list_places.added_at) AS last_added
    FROM list_places
    GROUP BY list_places.list_id
) place_counts ON l.id = place_counts.list_id;

-- 4. Recreate enriched_list_places view
CREATE VIEW enriched_list_places AS
SELECT 
    lp.list_id,
    lp.place_id,
    lp.added_at,
    lp.notes,
    lp.personal_rating,
    lp.visit_count,
    lp.sort_order,
    l.user_id,
    l.name AS list_name,
    l.is_default,
    gpc.google_place_id,
    gpc.name,
    gpc.formatted_address AS address,
    gpc.types AS google_types,
    gpc.rating AS google_rating,
    gpc.formatted_phone_number AS phone,
    gpc.website,
    gpc.opening_hours AS hours_open,
    gpc.photo_urls AS photos_urls
FROM list_places lp
JOIN lists l ON lp.list_id = l.id
JOIN google_places_cache gpc ON lp.place_id = gpc.google_place_id;

-- 5. Recreate google_places_cache_valid view
CREATE VIEW google_places_cache_valid AS
SELECT 
    google_place_id,
    name,
    formatted_address,
    geometry,
    types,
    rating,
    user_ratings_total,
    price_level,
    formatted_phone_number,
    international_phone_number,
    website,
    opening_hours,
    current_opening_hours,
    photos,
    reviews,
    business_status,
    place_id,
    plus_code,
    cached_at,
    expires_at,
    last_accessed,
    access_count,
    has_basic_data,
    has_contact_data,
    has_hours_data,
    has_photos_data,
    has_reviews_data,
    created_at,
    updated_at,
    photo_urls
FROM google_places_cache
WHERE expires_at > now();

-- 6. Recreate enriched_places view
CREATE VIEW enriched_places AS
SELECT 
    -- All fields from google_places_cache
    gpc.google_place_id,
    gpc.name,
    gpc.formatted_address,
    gpc.geometry,
    gpc.types,
    gpc.rating,
    gpc.user_ratings_total,
    gpc.price_level,
    gpc.formatted_phone_number,
    gpc.international_phone_number,
    gpc.website,
    gpc.opening_hours,
    gpc.current_opening_hours,
    gpc.photos,
    gpc.reviews,
    gpc.business_status,
    gpc.place_id,
    gpc.plus_code,
    gpc.cached_at,
    gpc.expires_at,
    gpc.last_accessed,
    gpc.access_count,
    gpc.has_basic_data,
    gpc.has_contact_data,
    gpc.has_hours_data,
    gpc.has_photos_data,
    gpc.has_reviews_data,
    gpc.created_at,
    gpc.updated_at,
    gpc.photo_urls,
    -- Editorial fields
    ep.custom_description,
    ep.featured_image_url,
    ep.pro_tips,
    ep.editorial_notes,
    ep.is_featured,
    ep.admin_tags,
    ep.priority_score,
    ep.city_context,
    ep.created_by AS editorial_created_by,
    ep.updated_by AS editorial_updated_by,
    ep.created_at AS editorial_created_at,
    ep.updated_at AS editorial_updated_at,
    -- Computed fields
    CASE 
        WHEN ep.featured_image_url IS NOT NULL AND ep.featured_image_url <> ''::text THEN ep.featured_image_url
        WHEN gpc.photo_urls IS NOT NULL AND array_length(gpc.photo_urls, 1) > 0 THEN gpc.photo_urls[1]
        ELSE NULL::text
    END AS primary_image_url,
    CASE 
        WHEN ep.custom_description IS NOT NULL AND ep.custom_description <> ''::text THEN ep.custom_description
        WHEN gpc.reviews IS NOT NULL AND jsonb_array_length(gpc.reviews) > 0 THEN 
            LEFT((gpc.reviews -> 0) ->> 'text'::text, 200) ||
            CASE 
                WHEN LENGTH((gpc.reviews -> 0) ->> 'text'::text) > 200 THEN '...'::text
                ELSE ''::text
            END
        ELSE NULL::text
    END AS display_description,
    CASE 
        WHEN ep.google_place_id IS NOT NULL THEN true
        ELSE false
    END AS has_editorial_content,
    COALESCE(ep.priority_score, 0) AS effective_priority_score,
    CASE 
        WHEN ep.admin_tags IS NOT NULL AND array_length(ep.admin_tags, 1) > 0 THEN 
            array_cat(gpc.types, ep.admin_tags)
        ELSE gpc.types
    END AS enhanced_types,
    gpc.rating AS effective_rating,
    gpc.user_ratings_total AS effective_rating_count
FROM google_places_cache gpc
LEFT JOIN editorial_places ep ON gpc.google_place_id = ep.google_place_id
WHERE gpc.business_status = 'OPERATIONAL'::text OR gpc.business_status IS NULL;

-- 7. Grant necessary permissions on all views
GRANT SELECT ON enriched_check_ins TO authenticated;
GRANT SELECT ON user_lists_with_counts TO authenticated;
GRANT SELECT ON enriched_list_places TO authenticated;
GRANT SELECT ON google_places_cache_valid TO authenticated;
GRANT SELECT ON enriched_places TO authenticated;
GRANT SELECT ON enriched_places TO anon;

-- 8. Verify views were created without SECURITY DEFINER
DO $$
DECLARE
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO view_count
    FROM pg_views
    WHERE schemaname = 'public'
    AND viewname IN ('enriched_check_ins', 'user_lists_with_counts', 'enriched_list_places', 'google_places_cache_valid', 'enriched_places');
    
    RAISE NOTICE 'Successfully recreated % views without SECURITY DEFINER', view_count;
END $$;