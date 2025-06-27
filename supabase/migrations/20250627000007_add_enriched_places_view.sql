-- Create enriched_places view that combines google_places_cache with editorial_places data
-- This view will be used by place detail screens to show enhanced place information

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
    
    -- Editorial fields from editorial_places (null if no editorial content)
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
        WHEN ep.featured_image_url IS NOT NULL AND ep.featured_image_url != '' THEN ep.featured_image_url
        WHEN gpc.photo_urls IS NOT NULL AND array_length(gpc.photo_urls, 1) > 0 THEN gpc.photo_urls[1]
        ELSE NULL
    END AS primary_image_url,
    
    CASE 
        WHEN ep.custom_description IS NOT NULL AND ep.custom_description != '' THEN ep.custom_description
        WHEN gpc.reviews IS NOT NULL AND jsonb_array_length(gpc.reviews) > 0 THEN 
            LEFT(gpc.reviews->0->>'text', 200) || CASE WHEN LENGTH(gpc.reviews->0->>'text') > 200 THEN '...' ELSE '' END
        ELSE NULL
    END AS display_description,
    
    -- Enhanced metadata
    CASE WHEN ep.google_place_id IS NOT NULL THEN true ELSE false END AS has_editorial_content,
    
    COALESCE(ep.priority_score, 0) AS effective_priority_score,
    
    -- Combine Google types with admin tags for enhanced categorization
    CASE 
        WHEN ep.admin_tags IS NOT NULL AND array_length(ep.admin_tags, 1) > 0 THEN 
            array_cat(gpc.types, ep.admin_tags)
        ELSE gpc.types
    END AS enhanced_types,
    
    -- Rating enhancement (could be extended with editorial ratings in future)
    gpc.rating AS effective_rating,
    gpc.user_ratings_total AS effective_rating_count

FROM google_places_cache gpc
LEFT JOIN editorial_places ep ON gpc.google_place_id = ep.google_place_id
WHERE gpc.business_status = 'OPERATIONAL'
   OR gpc.business_status IS NULL; -- Include places where business_status might not be set

-- Create indexes to optimize common queries on the view
CREATE INDEX IF NOT EXISTS idx_google_places_cache_business_status 
ON google_places_cache(business_status) 
WHERE business_status = 'OPERATIONAL';

CREATE INDEX IF NOT EXISTS idx_google_places_cache_rating 
ON google_places_cache(rating DESC) 
WHERE rating IS NOT NULL AND business_status = 'OPERATIONAL';

CREATE INDEX IF NOT EXISTS idx_editorial_places_is_featured 
ON editorial_places(is_featured) 
WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_editorial_places_priority_score 
ON editorial_places(priority_score DESC) 
WHERE priority_score > 0;

-- Grant permissions for the view
GRANT SELECT ON enriched_places TO authenticated;
GRANT SELECT ON enriched_places TO anon;

-- Log the view creation
DO $$
DECLARE
    total_places INTEGER;
    editorial_places INTEGER;
    featured_places INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_places FROM enriched_places;
    SELECT COUNT(*) INTO editorial_places FROM enriched_places WHERE has_editorial_content = true;
    SELECT COUNT(*) INTO featured_places FROM enriched_places WHERE is_featured = true;
    
    RAISE NOTICE 'ENRICHED_PLACES VIEW CREATED SUCCESSFULLY:';
    RAISE NOTICE 'Total operational places: %', total_places;
    RAISE NOTICE 'Places with editorial content: %', editorial_places;
    RAISE NOTICE 'Featured places: %', featured_places;
    RAISE NOTICE 'View includes computed fields: primary_image_url, display_description, enhanced_types';
END $$;