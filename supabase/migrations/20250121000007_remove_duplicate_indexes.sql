-- Remove duplicate indexes to optimize storage and write performance
-- These indexes are identical and only one is needed per table

-- 1. Remove duplicate index on google_places_cache
-- Keep: idx_google_places_cache_google_place_id (more descriptive name)
-- Remove: idx_google_places_cache_place_id (less descriptive)
DROP INDEX IF EXISTS idx_google_places_cache_place_id;

-- 2. Remove duplicate index on list_places  
-- Keep: idx_list_places_sort_order (more descriptive name)
-- Remove: idx_list_places_list_sort (less descriptive)
DROP INDEX IF EXISTS idx_list_places_list_sort;

-- 3. Remove duplicate index on places
-- Keep: idx_places_google_place_id_unique (more descriptive name indicating uniqueness)
-- Remove: idx_places_google_place_id (less descriptive)
DROP INDEX IF EXISTS idx_places_google_place_id;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully removed duplicate indexes:';
    RAISE NOTICE '- Removed idx_google_places_cache_place_id (duplicate of idx_google_places_cache_google_place_id)';
    RAISE NOTICE '- Removed idx_list_places_list_sort (duplicate of idx_list_places_sort_order)';
    RAISE NOTICE '- Removed idx_places_google_place_id (duplicate of idx_places_google_place_id_unique)';
    RAISE NOTICE 'This will improve write performance and reduce storage overhead';
END $$;