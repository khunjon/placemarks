-- Create RPC function to get place coordinates
CREATE OR REPLACE FUNCTION get_place_coordinates(place_uuid UUID)
RETURNS TABLE (
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Y(coordinates) as latitude,
    ST_X(coordinates) as longitude
  FROM places
  WHERE id = place_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 