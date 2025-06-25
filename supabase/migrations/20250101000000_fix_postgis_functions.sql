-- Fix PostGIS functions for place availability
-- This migration fixes the geometry type errors by properly defining PostGIS functions

-- Drop existing functions that might have type issues
DROP FUNCTION IF EXISTS count_places_within_radius(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
DROP FUNCTION IF EXISTS has_minimum_places_within_radius(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER);

-- Create the count_places_within_radius function with proper PostGIS types
CREATE OR REPLACE FUNCTION count_places_within_radius(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 15000
)
RETURNS INTEGER AS $$
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
  
  IF radius_meters <= 0 OR radius_meters > 100000 THEN
    RAISE EXCEPTION 'Radius must be between 1 and 100,000 meters';
  END IF;
  
  -- Use PostGIS geography functions for accurate distance calculation
  RETURN (
    SELECT COUNT(*)
    FROM places
    WHERE coordinates IS NOT NULL
      AND ST_DWithin(
        coordinates::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
        radius_meters
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the has_minimum_places_within_radius function with optimized counting
CREATE OR REPLACE FUNCTION has_minimum_places_within_radius(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 15000,
  minimum_places INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  place_count INTEGER;
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
  
  IF radius_meters <= 0 OR radius_meters > 100000 THEN
    RAISE EXCEPTION 'Radius must be between 1 and 100,000 meters';
  END IF;
  
  IF minimum_places < 1 THEN
    RAISE EXCEPTION 'Minimum places must be at least 1';
  END IF;
  
  -- Optimized query that stops counting once we reach the minimum
  -- Uses LIMIT to stop early for better performance
  SELECT COUNT(*) INTO place_count
  FROM (
    SELECT 1
    FROM places
    WHERE coordinates IS NOT NULL
      AND ST_DWithin(
        coordinates::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
        radius_meters
      )
    LIMIT minimum_places
  ) limited_results;
  
  -- Return true if we found at least the minimum number
  RETURN place_count >= minimum_places;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION count_places_within_radius(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION has_minimum_places_within_radius(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) TO authenticated; 