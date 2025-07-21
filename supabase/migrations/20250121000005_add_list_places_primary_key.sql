-- Add Primary Key to list_places table
-- This improves scalability and performance for the many-to-many relationship table

-- First, ensure place_id column is NOT NULL since it should be required
ALTER TABLE list_places ALTER COLUMN place_id SET NOT NULL;

-- Add composite primary key on (list_id, place_id)
-- This enforces that a place can only be added to a specific list once
ALTER TABLE list_places ADD CONSTRAINT list_places_pkey PRIMARY KEY (list_id, place_id);

-- Log completion
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM list_places;
    RAISE NOTICE 'Successfully added primary key to list_places table';
    RAISE NOTICE 'Primary key: (list_id, place_id) - ensures unique place per list';
    RAISE NOTICE 'Affected % rows', row_count;
END $$;