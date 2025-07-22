-- Add primary_image_url to enriched_places view
-- This pulls from user_place_photos table, preferring photos marked as is_primary = true

-- Drop the existing view
DROP VIEW IF EXISTS public.enriched_places;

-- Recreate the view with primary_image_url
CREATE OR REPLACE VIEW public.enriched_places
WITH (security_invoker = true) AS
SELECT 
    -- Google Places Cache fields (primary source)
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
    gpc.photo_urls,
    gpc.reviews,
    gpc.business_status,
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
    
    -- Editorial content (if available)
    ep.custom_description,
    ep.featured_image_url,
    ep.pro_tips,
    ep.editorial_notes,
    ep.is_featured,
    ep.admin_tags,
    ep.priority_score,
    ep.city_context,
    
    -- User-uploaded primary photo (NEW)
    (
        SELECT COALESCE(display_url, photo_url)
        FROM user_place_photos upp
        WHERE upp.google_place_id = gpc.google_place_id
        ORDER BY 
            upp.is_primary DESC,  -- Primary photos first
            upp.created_at DESC   -- Then most recent
        LIMIT 1
    ) AS primary_image_url,
    
    -- Computed fields for backward compatibility
    gpc.google_place_id AS id,
    gpc.formatted_address AS address,
    -- Extract coordinates from geometry if available
    CASE 
        WHEN gpc.geometry IS NOT NULL 
             AND gpc.geometry->>'location' IS NOT NULL 
        THEN ARRAY[
            (gpc.geometry->'location'->>'lng')::float,
            (gpc.geometry->'location'->>'lat')::float
        ]
        ELSE NULL
    END AS coordinates,
    
    -- Primary type from types array
    CASE 
        WHEN array_length(gpc.types, 1) > 0 
        THEN gpc.types[1]
        ELSE NULL
    END AS primary_type,
    
    -- Legacy field mapping
    CASE 
        WHEN array_length(gpc.types, 1) > 0 
        THEN gpc.types[1]
        ELSE NULL
    END AS place_type,
    
    -- Legacy Bangkok context field (deprecated but kept for compatibility)
    NULL::jsonb AS bangkok_context,
    
    -- Additional computed fields
    'Asia/Bangkok' AS timezone,
    CASE 
        WHEN ep.google_place_id IS NOT NULL 
        THEN true 
        ELSE false 
    END AS has_editorial_content,
    
    -- Display description (editorial or Google description)
    COALESCE(
        ep.custom_description,
        gpc.reviews->0->>'text'
    ) AS display_description,
    
    -- Effective rating (for now just Google rating, could add user ratings later)
    gpc.rating AS effective_rating,
    gpc.user_ratings_total AS effective_rating_count,
    
    -- Enhanced types array (same as types for now)
    gpc.types AS enhanced_types,
    
    -- Effective priority score for recommendations
    COALESCE(ep.priority_score, 0) AS effective_priority_score

FROM google_places_cache gpc
LEFT JOIN editorial_places ep ON gpc.google_place_id = ep.google_place_id;

-- Grant necessary permissions
GRANT SELECT ON public.enriched_places TO anon;
GRANT SELECT ON public.enriched_places TO authenticated;

-- Add comment
COMMENT ON VIEW public.enriched_places IS 'Unified view combining Google Places data with editorial content and user photos';
COMMENT ON COLUMN public.enriched_places.primary_image_url IS 'Primary user-uploaded photo URL (display_url if available, otherwise photo_url)';