-- Fix Google Places PostGIS functions that are causing geometry type errors
-- This migration fixes the get_google_places_within_radius function

-- Drop the existing function that has type issues
DROP FUNCTION IF EXISTS get_google_places_within_radius(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT[]);

-- Create the get_google_places_within_radius function with proper PostGIS syntax
CREATE OR REPLACE FUNCTION get_google_places_within_radius(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  limit_count INTEGER DEFAULT 50,
  exclude_place_ids TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE (
  google_place_id TEXT,
  name TEXT,
  formatted_address TEXT,
  rating DOUBLE PRECISION,
  user_ratings_total INTEGER,
  price_level INTEGER,
  types TEXT[],
  business_status TEXT,
  geometry JSONB,
  photo_urls TEXT[],
  website TEXT,
  formatted_phone_number TEXT,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  -- Validate input parameters
  IF center_lat IS NULL OR center_lng IS NULL THEN
    RAISE EXCEPTION 'Latitude and longitude cannot be null';
  END IF;
  
  IF center_lat < -90 OR center_lat > 90 THEN
    RAISE EXCEPTION 'Latitude must be between -90 and 90 degrees';
  END IF;
  
  IF center_lng < -180 OR center_lng > 180 THEN
    RAISE EXCEPTION 'Longitude must be between -180 and 180 degrees';
  END IF;
  
  IF radius_km <= 0 OR radius_km > 100 THEN
    RAISE EXCEPTION 'Radius must be between 0.1 and 100 kilometers';
  END IF;
  
  -- Return places within radius, excluding specified place IDs
  RETURN QUERY
  SELECT 
    gpc.google_place_id,
    gpc.name,
    gpc.formatted_address,
    gpc.rating,
    gpc.user_ratings_total,
    gpc.price_level,
    gpc.types,
    gpc.business_status,
    gpc.geometry,
    gpc.photo_urls,
    gpc.website,
    gpc.formatted_phone_number,
    ROUND((ST_Distance(
      ST_SetSRID(ST_MakePoint(
        ((gpc.geometry->'location')->>'lng')::FLOAT,
        ((gpc.geometry->'location')->>'lat')::FLOAT
      ), 4326)::geography,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
    ) / 1000)::numeric, 2) as distance_km
  FROM google_places_cache gpc
  WHERE 
    gpc.geometry IS NOT NULL
    AND gpc.name IS NOT NULL
    AND gpc.business_status = 'OPERATIONAL'
    AND NOT (gpc.google_place_id = ANY(exclude_place_ids))
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(
        ((gpc.geometry->'location')->>'lng')::FLOAT,
        ((gpc.geometry->'location')->>'lat')::FLOAT
      ), 4326)::geography,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY 
    ST_SetSRID(ST_MakePoint(
      ((gpc.geometry->'location')->>'lng')::FLOAT,
      ((gpc.geometry->'location')->>'lat')::FLOAT
    ), 4326) <-> ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_google_places_within_radius(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT[]) TO authenticated; 