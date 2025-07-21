-- Add indexes for unindexed foreign keys to improve JOIN performance

-- Add index for editorial_places.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_editorial_places_created_by 
ON editorial_places(created_by);

-- Add index for editorial_places.updated_by foreign key  
CREATE INDEX IF NOT EXISTS idx_editorial_places_updated_by 
ON editorial_places(updated_by);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully added indexes for foreign keys:';
    RAISE NOTICE '- idx_editorial_places_created_by on editorial_places(created_by)';
    RAISE NOTICE '- idx_editorial_places_updated_by on editorial_places(updated_by)';
    RAISE NOTICE 'These indexes will improve JOIN performance with the users table';
END $$;