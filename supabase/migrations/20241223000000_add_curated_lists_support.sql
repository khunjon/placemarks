-- Add curated lists support to the lists table
-- This migration adds fields needed for admin-managed curated lists

-- Add new columns to lists table for curated lists functionality
ALTER TABLE lists ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS list_type TEXT;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('user', 'auto', 'curated'));
ALTER TABLE lists ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS is_curated BOOLEAN DEFAULT FALSE;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS publisher_name TEXT;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS publisher_logo_url TEXT;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS external_link TEXT;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS location_scope TEXT;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS curator_priority INTEGER DEFAULT 0;

-- Rename privacy_level to visibility for consistency with TypeScript types
ALTER TABLE lists RENAME COLUMN privacy_level TO visibility;

-- Update the visibility constraint to include curated lists
ALTER TABLE lists DROP CONSTRAINT IF EXISTS lists_privacy_level_check;
ALTER TABLE lists ADD CONSTRAINT lists_visibility_check 
  CHECK (visibility IN ('private', 'friends', 'public', 'curated'));

-- Make user_id nullable for curated lists (admin-managed lists don't have a user owner)
ALTER TABLE lists ALTER COLUMN user_id DROP NOT NULL;

-- Add indexes for efficient querying of curated lists
CREATE INDEX IF NOT EXISTS idx_lists_is_curated ON lists (is_curated) WHERE is_curated = true;
CREATE INDEX IF NOT EXISTS idx_lists_curator_priority ON lists (curator_priority DESC) WHERE is_curated = true;
CREATE INDEX IF NOT EXISTS idx_lists_location_scope ON lists (location_scope) WHERE is_curated = true;
CREATE INDEX IF NOT EXISTS idx_lists_publisher_name ON lists (publisher_name) WHERE is_curated = true;
CREATE INDEX IF NOT EXISTS idx_lists_visibility ON lists (visibility);
CREATE INDEX IF NOT EXISTS idx_lists_type ON lists (type);

-- Add updated_at timestamp tracking
ALTER TABLE lists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lists_updated_at 
    BEFORE UPDATE ON lists 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Admin-specific functions for curated lists management

-- Function to get all curated lists with optional filtering
CREATE OR REPLACE FUNCTION get_curated_lists(
  p_location_scope TEXT DEFAULT NULL,
  p_list_type TEXT DEFAULT NULL,
  p_publisher_name TEXT DEFAULT NULL,
  p_min_priority INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  list_type TEXT,
  icon TEXT,
  color TEXT,
  type TEXT,
  visibility TEXT,
  is_curated BOOLEAN,
  publisher_name TEXT,
  publisher_logo_url TEXT,
  external_link TEXT,
  location_scope TEXT,
  curator_priority INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  place_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.description,
    l.list_type,
    l.icon,
    l.color,
    l.type,
    l.visibility,
    l.is_curated,
    l.publisher_name,
    l.publisher_logo_url,
    l.external_link,
    l.location_scope,
    l.curator_priority,
    l.created_at,
    l.updated_at,
    COALESCE(lp.place_count, 0) as place_count
  FROM lists l
  LEFT JOIN (
    SELECT list_id, COUNT(*) as place_count 
    FROM list_places 
    GROUP BY list_id
  ) lp ON l.id = lp.list_id
  WHERE l.is_curated = true
    AND (p_location_scope IS NULL OR l.location_scope = p_location_scope)
    AND (p_list_type IS NULL OR l.list_type = p_list_type)
    AND (p_publisher_name IS NULL OR l.publisher_name = p_publisher_name)
    AND (p_min_priority IS NULL OR l.curator_priority >= p_min_priority)
  ORDER BY l.curator_priority DESC, l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get curated list details with places
CREATE OR REPLACE FUNCTION get_curated_list_with_places(list_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  list_type TEXT,
  icon TEXT,
  color TEXT,
  type TEXT,
  visibility TEXT,
  is_curated BOOLEAN,
  publisher_name TEXT,
  publisher_logo_url TEXT,
  external_link TEXT,
  location_scope TEXT,
  curator_priority INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  places JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.description,
    l.list_type,
    l.icon,
    l.color,
    l.type,
    l.visibility,
    l.is_curated,
    l.publisher_name,
    l.publisher_logo_url,
    l.external_link,
    l.location_scope,
    l.curator_priority,
    l.created_at,
    l.updated_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'place_id', p.id,
          'name', p.name,
          'address', p.address,
          'google_place_id', p.google_place_id,
          'place_type', p.place_type,
          'price_level', p.price_level,
          'coordinates', ARRAY[ST_X(p.coordinates), ST_Y(p.coordinates)],
          'added_at', lp.added_at,
          'notes', lp.notes
        ) ORDER BY lp.added_at DESC
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::jsonb
    ) as places
  FROM lists l
  LEFT JOIN list_places lp ON l.id = lp.list_id
  LEFT JOIN places p ON lp.place_id = p.id
  WHERE l.id = list_uuid AND l.is_curated = true
  GROUP BY l.id, l.name, l.description, l.list_type, l.icon, l.color, l.type, 
           l.visibility, l.is_curated, l.publisher_name, l.publisher_logo_url, 
           l.external_link, l.location_scope, l.curator_priority, l.created_at, l.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update curator priority for multiple lists (batch operation)
CREATE OR REPLACE FUNCTION update_curator_priorities(
  list_priorities JSONB -- Array of {id: UUID, priority: INTEGER}
)
RETURNS INTEGER AS $$
DECLARE
  list_item JSONB;
  updated_count INTEGER := 0;
BEGIN
  FOR list_item IN SELECT * FROM jsonb_array_elements(list_priorities)
  LOOP
    UPDATE lists 
    SET curator_priority = (list_item->>'priority')::INTEGER,
        updated_at = NOW()
    WHERE id = (list_item->>'id')::UUID 
      AND is_curated = true;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin statistics for curated lists
CREATE OR REPLACE FUNCTION get_curated_lists_stats()
RETURNS TABLE (
  total_curated_lists BIGINT,
  total_places_in_curated_lists BIGINT,
  publishers_count BIGINT,
  location_scopes_count BIGINT,
  avg_places_per_list NUMERIC,
  most_recent_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT l.id) as total_curated_lists,
    COUNT(DISTINCT lp.place_id) as total_places_in_curated_lists,
    COUNT(DISTINCT l.publisher_name) as publishers_count,
    COUNT(DISTINCT l.location_scope) as location_scopes_count,
    ROUND(
      CASE 
        WHEN COUNT(DISTINCT l.id) > 0 
        THEN COUNT(DISTINCT lp.place_id)::NUMERIC / COUNT(DISTINCT l.id)::NUMERIC 
        ELSE 0 
      END, 2
    ) as avg_places_per_list,
    MAX(l.updated_at) as most_recent_update
  FROM lists l
  LEFT JOIN list_places lp ON l.id = lp.list_id
  WHERE l.is_curated = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for curated lists

-- Allow public read access to curated lists
CREATE POLICY "Anyone can view curated lists" ON lists FOR SELECT USING (
  is_curated = true AND visibility IN ('public', 'curated')
);

-- Allow admin operations on curated lists (you'll need to implement admin user identification)
-- For now, we create a placeholder policy that can be updated with proper admin authentication
CREATE POLICY "Admins can manage curated lists" ON lists FOR ALL USING (
  is_curated = true AND 
  -- TODO: Replace with proper admin authentication check
  -- Example: auth.jwt() ->> 'role' = 'admin'
  true -- Placeholder - implement proper admin authentication
);

-- Allow public read access to list_places for curated lists
CREATE POLICY "Anyone can view curated list places" ON list_places FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lists 
    WHERE lists.id = list_places.list_id 
      AND lists.is_curated = true 
      AND lists.visibility IN ('public', 'curated')
  )
);

-- Allow admin operations on list_places for curated lists
CREATE POLICY "Admins can manage curated list places" ON list_places FOR ALL USING (
  EXISTS (
    SELECT 1 FROM lists 
    WHERE lists.id = list_places.list_id 
      AND lists.is_curated = true
  )
  -- TODO: Add proper admin authentication check here
);

-- Add comments for documentation
COMMENT ON COLUMN lists.is_curated IS 'Indicates if this list is managed by administrators';
COMMENT ON COLUMN lists.publisher_name IS 'Name of the organization or entity that curated this list';
COMMENT ON COLUMN lists.publisher_logo_url IS 'URL to the publisher logo for branding';
COMMENT ON COLUMN lists.external_link IS 'Optional external link for more information about the list';
COMMENT ON COLUMN lists.location_scope IS 'Geographic scope of the list (e.g., "Bangkok", "Sukhumvit", "Global")';
COMMENT ON COLUMN lists.curator_priority IS 'Priority for ordering curated lists (higher = more prominent)';
COMMENT ON FUNCTION get_curated_lists IS 'Retrieve curated lists with optional filtering and place counts';
COMMENT ON FUNCTION get_curated_list_with_places IS 'Get detailed curated list information including all places';
COMMENT ON FUNCTION update_curator_priorities IS 'Batch update curator priorities for multiple lists';
COMMENT ON FUNCTION get_curated_lists_stats IS 'Get statistics about curated lists for admin dashboards';