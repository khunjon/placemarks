-- Complete migration from UUID place_id to google_place_id
-- This migration is reversible with the corresponding DOWN migration

-- UP MIGRATION
-- =============

-- 1. Drop views that depend on place_id columns
DROP VIEW IF EXISTS enriched_check_ins;
DROP VIEW IF EXISTS enriched_list_places;

-- 2. Drop old foreign key constraints on place_id columns
-- First, let's identify and drop existing foreign key constraints
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Drop foreign key constraints for check_ins.place_id
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'check_ins'::regclass 
        AND contype = 'f' 
        AND pg_get_constraintdef(oid) LIKE '%place_id%'
    LOOP
        EXECUTE format('ALTER TABLE check_ins DROP CONSTRAINT %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint % from check_ins', constraint_record.conname;
    END LOOP;
    
    -- Drop foreign key constraints for list_places.place_id
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'list_places'::regclass 
        AND contype = 'f' 
        AND pg_get_constraintdef(oid) LIKE '%place_id%'
    LOOP
        EXECUTE format('ALTER TABLE list_places DROP CONSTRAINT %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint % from list_places', constraint_record.conname;
    END LOOP;
    
    -- Drop foreign key constraints for user_place_ratings.place_id
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'user_place_ratings'::regclass 
        AND contype = 'f' 
        AND pg_get_constraintdef(oid) LIKE '%place_id%'
    LOOP
        EXECUTE format('ALTER TABLE user_place_ratings DROP CONSTRAINT %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint % from user_place_ratings', constraint_record.conname;
    END LOOP;
END $$;

-- 3. Drop indexes that reference the old place_id columns
DROP INDEX IF EXISTS idx_check_ins_place_id;
DROP INDEX IF EXISTS idx_list_places_place_id;
DROP INDEX IF EXISTS idx_user_place_ratings_place_id;

-- 4. Drop the old place_id columns (UUID type)
ALTER TABLE check_ins DROP COLUMN IF EXISTS place_id;
ALTER TABLE list_places DROP COLUMN IF EXISTS place_id;
ALTER TABLE user_place_ratings DROP COLUMN IF EXISTS place_id;

-- 4. Rename google_place_id_temp columns to place_id
ALTER TABLE check_ins RENAME COLUMN google_place_id_temp TO place_id;
ALTER TABLE list_places RENAME COLUMN google_place_id_temp TO place_id;
ALTER TABLE user_place_ratings RENAME COLUMN google_place_id_temp TO place_id;

-- 5. Add new foreign key constraints referencing google_places_cache(google_place_id)
ALTER TABLE check_ins 
ADD CONSTRAINT fk_check_ins_place_id 
FOREIGN KEY (place_id) 
REFERENCES google_places_cache(google_place_id) 
ON DELETE CASCADE;

ALTER TABLE list_places 
ADD CONSTRAINT fk_list_places_place_id 
FOREIGN KEY (place_id) 
REFERENCES google_places_cache(google_place_id) 
ON DELETE CASCADE;

ALTER TABLE user_place_ratings 
ADD CONSTRAINT fk_user_place_ratings_place_id 
FOREIGN KEY (place_id) 
REFERENCES google_places_cache(google_place_id) 
ON DELETE CASCADE;

-- 6. Update indexes that referenced the old place_id columns
CREATE INDEX idx_check_ins_place_id ON check_ins(place_id);
CREATE INDEX idx_list_places_place_id ON list_places(place_id);
CREATE INDEX idx_user_place_ratings_place_id ON user_place_ratings(place_id);

-- Drop the temporary indexes
DROP INDEX IF EXISTS idx_check_ins_google_place_id_temp;
DROP INDEX IF EXISTS idx_list_places_google_place_id_temp;
DROP INDEX IF EXISTS idx_user_place_ratings_google_place_id_temp;

-- 7. Recreate views with updated place_id references to google_places_cache
CREATE VIEW enriched_check_ins AS
SELECT 
    ci.id,
    ci.user_id,
    ci.place_id,
    ci.timestamp,
    ci.rating,
    ci.notes,
    ci.comment,
    ci.photos,
    ci.tags,
    ci.context,
    ci.weather_context,
    ci.companion_type,
    ci.meal_type,
    ci.transportation_method,
    ci.visit_duration,
    ci.would_return,
    ci.created_at,
    ci.updated_at,
    gpc.google_place_id,
    gpc.name AS place_name,
    gpc.formatted_address AS place_address,
    gpc.types AS google_types,
    gpc.rating AS google_rating,
    gpc.formatted_phone_number AS place_phone,
    gpc.website AS place_website,
    gpc.opening_hours AS hours_open,
    gpc.photo_urls AS place_photos
FROM check_ins ci
JOIN google_places_cache gpc ON ci.place_id = gpc.google_place_id;

CREATE VIEW enriched_list_places AS
SELECT 
    lp.list_id,
    lp.place_id,
    lp.added_at,
    lp.notes,
    lp.personal_rating,
    lp.visit_count,
    lp.sort_order,
    l.user_id,
    l.name AS list_name,
    l.is_default,
    gpc.google_place_id,
    gpc.name,
    gpc.formatted_address AS address,
    gpc.types AS google_types,
    gpc.rating AS google_rating,
    gpc.formatted_phone_number AS phone,
    gpc.website,
    gpc.opening_hours AS hours_open,
    gpc.photo_urls AS photos_urls
FROM list_places lp
JOIN lists l ON lp.list_id = l.id
JOIN google_places_cache gpc ON lp.place_id = gpc.google_place_id;

-- Final validation
DO $$
DECLARE
    check_ins_count INTEGER;
    list_places_count INTEGER;
    user_place_ratings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO check_ins_count FROM check_ins WHERE place_id IS NOT NULL;
    SELECT COUNT(*) INTO list_places_count FROM list_places WHERE place_id IS NOT NULL;
    SELECT COUNT(*) INTO user_place_ratings_count FROM user_place_ratings WHERE place_id IS NOT NULL;
    
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY:';
    RAISE NOTICE 'check_ins with place_id: %', check_ins_count;
    RAISE NOTICE 'list_places with place_id: %', list_places_count;
    RAISE NOTICE 'user_place_ratings with place_id: %', user_place_ratings_count;
    RAISE NOTICE 'All tables now use google_place_id as place_id with proper foreign key constraints';
    RAISE NOTICE 'Views enriched_check_ins and enriched_list_places have been recreated';
END $$;