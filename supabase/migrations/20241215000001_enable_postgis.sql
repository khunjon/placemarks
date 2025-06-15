-- Enable PostGIS extension for spatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Update the search function to use PostGIS properly
DROP FUNCTION IF EXISTS search_places_near_location(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);

CREATE OR REPLACE FUNCTION search_places_near_location(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  place_id UUID,
  name TEXT,
  address TEXT,
  place_type TEXT,
  price_level INTEGER,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.address,
    p.place_type,
    p.price_level,
    ST_Distance(
      ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
      ST_GeogFromText('POINT(' || ST_X(p.coordinates) || ' ' || ST_Y(p.coordinates) || ')')
    ) as distance_meters
  FROM places p
  WHERE ST_DWithin(
    ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
    ST_GeogFromText('POINT(' || ST_X(p.coordinates) || ' ' || ST_Y(p.coordinates) || ')'),
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql; 