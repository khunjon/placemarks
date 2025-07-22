-- Update enriched_places view to use user-uploaded photos for primary_image_url
-- This replaces the existing logic that uses Google Photos

-- Drop the existing view
DROP VIEW IF EXISTS public.enriched_places CASCADE;

-- Recreate the view with updated primary_image_url logic
CREATE VIEW public.enriched_places AS
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
    -- UPDATED: primary_image_url now uses user photos instead of Google photos
    CASE 
        -- First priority: editorial featured image
        WHEN ep.featured_image_url IS NOT NULL AND ep.featured_image_url <> ''::text THEN ep.featured_image_url
        -- Second priority: user-uploaded photos
        WHEN EXISTS (
            SELECT 1 FROM user_place_photos upp 
            WHERE upp.google_place_id = gpc.google_place_id
        ) THEN (
            SELECT COALESCE(upp.display_url, upp.photo_url)
            FROM user_place_photos upp
            WHERE upp.google_place_id = gpc.google_place_id
            ORDER BY 
                upp.is_primary DESC,  -- Primary photos first
                upp.created_at DESC   -- Then most recent
            LIMIT 1
        )
        -- Third priority: Google photo URLs as fallback
        WHEN gpc.photo_urls IS NOT NULL AND array_length(gpc.photo_urls, 1) > 0 THEN gpc.photo_urls[1]
        ELSE NULL::text
    END AS primary_image_url,
    
    -- Display description
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
    
    -- Other computed fields
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

-- Grant necessary permissions
GRANT SELECT ON public.enriched_places TO authenticated;
GRANT SELECT ON public.enriched_places TO anon;

-- Test the updated view
SELECT 
    e.google_place_id,
    e.name,
    e.primary_image_url,
    CASE 
        WHEN e.primary_image_url LIKE '%supabase.co/storage%' THEN 'User Photo'
        WHEN e.primary_image_url LIKE '%googleusercontent%' THEN 'Google Photo'
        WHEN e.primary_image_url IS NOT NULL THEN 'Editorial Photo'
        ELSE 'No Photo'
    END as photo_source
FROM enriched_places e
INNER JOIN user_place_photos upp ON e.google_place_id = upp.google_place_id
LIMIT 10;