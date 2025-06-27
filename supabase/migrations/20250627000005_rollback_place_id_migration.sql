-- DOWN MIGRATION: Rollback place_id migration from google_place_id back to UUID
-- This reverses the changes made in migration 20250627000004
-- WARNING: This rollback assumes the original places table with UUID ids still exists

-- DOWN MIGRATION
-- ==============

-- 1. Drop current foreign key constraints
ALTER TABLE check_ins DROP CONSTRAINT IF EXISTS fk_check_ins_place_id;
ALTER TABLE list_places DROP CONSTRAINT IF EXISTS fk_list_places_place_id;
ALTER TABLE user_place_ratings DROP CONSTRAINT IF EXISTS fk_user_place_ratings_place_id;

-- 2. Drop current indexes
DROP INDEX IF EXISTS idx_check_ins_place_id;
DROP INDEX IF EXISTS idx_list_places_place_id;
DROP INDEX IF EXISTS idx_user_place_ratings_place_id;

-- 3. Rename place_id columns to google_place_id_temp (to preserve data)
ALTER TABLE check_ins RENAME COLUMN place_id TO google_place_id_temp;
ALTER TABLE list_places RENAME COLUMN place_id TO google_place_id_temp;
ALTER TABLE user_place_ratings RENAME COLUMN place_id TO google_place_id_temp;

-- 4. Add back UUID place_id columns
ALTER TABLE check_ins ADD COLUMN place_id UUID;
ALTER TABLE list_places ADD COLUMN place_id UUID;
ALTER TABLE user_place_ratings ADD COLUMN place_id UUID;

-- 5. Populate UUID place_id columns by joining back with places table
UPDATE check_ins 
SET place_id = p.id 
FROM places p 
WHERE check_ins.google_place_id_temp = p.google_place_id;

UPDATE list_places 
SET place_id = p.id 
FROM places p 
WHERE list_places.google_place_id_temp = p.google_place_id;

UPDATE user_place_ratings 
SET place_id = p.id 
FROM places p 
WHERE user_place_ratings.google_place_id_temp = p.google_place_id;

-- 6. Restore original foreign key constraints to places table
ALTER TABLE check_ins 
ADD CONSTRAINT fk_check_ins_place_id 
FOREIGN KEY (place_id) 
REFERENCES places(id) 
ON DELETE CASCADE;

ALTER TABLE list_places 
ADD CONSTRAINT fk_list_places_place_id 
FOREIGN KEY (place_id) 
REFERENCES places(id) 
ON DELETE CASCADE;

ALTER TABLE user_place_ratings 
ADD CONSTRAINT fk_user_place_ratings_place_id 
FOREIGN KEY (place_id) 
REFERENCES places(id) 
ON DELETE CASCADE;

-- 7. Restore original indexes
CREATE INDEX idx_check_ins_place_id ON check_ins(place_id);
CREATE INDEX idx_list_places_place_id ON list_places(place_id);
CREATE INDEX idx_user_place_ratings_place_id ON user_place_ratings(place_id);

-- 8. Drop the google_place_id_temp columns
ALTER TABLE check_ins DROP COLUMN google_place_id_temp;
ALTER TABLE list_places DROP COLUMN google_place_id_temp;
ALTER TABLE user_place_ratings DROP COLUMN google_place_id_temp;

-- Final validation for rollback
DO $$
DECLARE
    check_ins_count INTEGER;
    list_places_count INTEGER;
    user_place_ratings_count INTEGER;
    check_ins_null INTEGER;
    list_places_null INTEGER;
    user_place_ratings_null INTEGER;
BEGIN
    SELECT COUNT(*) INTO check_ins_count FROM check_ins WHERE place_id IS NOT NULL;
    SELECT COUNT(*) INTO list_places_count FROM list_places WHERE place_id IS NOT NULL;
    SELECT COUNT(*) INTO user_place_ratings_count FROM user_place_ratings WHERE place_id IS NOT NULL;
    
    SELECT COUNT(*) INTO check_ins_null FROM check_ins WHERE place_id IS NULL;
    SELECT COUNT(*) INTO list_places_null FROM list_places WHERE place_id IS NULL;
    SELECT COUNT(*) INTO user_place_ratings_null FROM user_place_ratings WHERE place_id IS NULL;
    
    RAISE NOTICE 'ROLLBACK COMPLETED:';
    RAISE NOTICE 'check_ins with UUID place_id: %, null: %', check_ins_count, check_ins_null;
    RAISE NOTICE 'list_places with UUID place_id: %, null: %', list_places_count, list_places_null;
    RAISE NOTICE 'user_place_ratings with UUID place_id: %, null: %', user_place_ratings_count, user_place_ratings_null;
    
    IF check_ins_null > 0 OR list_places_null > 0 OR user_place_ratings_null > 0 THEN
        RAISE WARNING 'Some records could not be mapped back to UUID place_id - manual data cleanup may be required';
    ELSE
        RAISE NOTICE 'All records successfully rolled back to UUID place_id system';
    END IF;
END $$;