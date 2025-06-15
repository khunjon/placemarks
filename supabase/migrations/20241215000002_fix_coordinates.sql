-- Add a temporary column for PostGIS geometry
ALTER TABLE places ADD COLUMN coordinates_geom geometry(Point, 4326);

-- Convert existing POINT data to PostGIS geometry
-- Since we don't have existing data, we'll just prepare the column
UPDATE places SET coordinates_geom = ST_GeomFromText('POINT(' || coordinates[0] || ' ' || coordinates[1] || ')', 4326) WHERE coordinates IS NOT NULL;

-- Drop the old column and rename the new one
ALTER TABLE places DROP COLUMN coordinates;
ALTER TABLE places RENAME COLUMN coordinates_geom TO coordinates;

-- Update the search function to work with PostGIS geometry
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
      p.coordinates::geography
    ) as distance_meters
  FROM places p
  WHERE ST_DWithin(
    ST_GeogFromText('POINT(' || lng || ' ' || lat || ')'),
    p.coordinates::geography,
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Update the index to use PostGIS
DROP INDEX IF EXISTS idx_places_coordinates;
CREATE INDEX idx_places_coordinates ON places USING GIST (coordinates); 