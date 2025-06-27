-- Populate the temporary google_place_id columns by joining with the existing places table
-- Include validation queries to ensure no data loss

-- First, let's check the current counts before migration
DO $$
DECLARE
    check_ins_count INTEGER;
    list_places_count INTEGER;
    user_place_ratings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO check_ins_count FROM check_ins;
    SELECT COUNT(*) INTO list_places_count FROM list_places;
    SELECT COUNT(*) INTO user_place_ratings_count FROM user_place_ratings;
    
    RAISE NOTICE 'PRE-MIGRATION COUNTS:';
    RAISE NOTICE 'check_ins: %', check_ins_count;
    RAISE NOTICE 'list_places: %', list_places_count;
    RAISE NOTICE 'user_place_ratings: %', user_place_ratings_count;
END $$;

-- Update check_ins table
UPDATE check_ins 
SET google_place_id_temp = p.google_place_id 
FROM places p 
WHERE check_ins.place_id = p.id;

-- Update list_places table
UPDATE list_places 
SET google_place_id_temp = p.google_place_id 
FROM places p 
WHERE list_places.place_id = p.id;

-- Update user_place_ratings table
UPDATE user_place_ratings 
SET google_place_id_temp = p.google_place_id 
FROM places p 
WHERE user_place_ratings.place_id = p.id;

-- Validation queries to ensure no data loss
DO $$
DECLARE
    check_ins_total INTEGER;
    check_ins_populated INTEGER;
    check_ins_null INTEGER;
    list_places_total INTEGER;
    list_places_populated INTEGER;
    list_places_null INTEGER;
    user_place_ratings_total INTEGER;
    user_place_ratings_populated INTEGER;
    user_place_ratings_null INTEGER;
BEGIN
    -- Check check_ins table
    SELECT COUNT(*) INTO check_ins_total FROM check_ins;
    SELECT COUNT(*) INTO check_ins_populated FROM check_ins WHERE google_place_id_temp IS NOT NULL;
    SELECT COUNT(*) INTO check_ins_null FROM check_ins WHERE google_place_id_temp IS NULL;
    
    -- Check list_places table
    SELECT COUNT(*) INTO list_places_total FROM list_places;
    SELECT COUNT(*) INTO list_places_populated FROM list_places WHERE google_place_id_temp IS NOT NULL;
    SELECT COUNT(*) INTO list_places_null FROM list_places WHERE google_place_id_temp IS NULL;
    
    -- Check user_place_ratings table
    SELECT COUNT(*) INTO user_place_ratings_total FROM user_place_ratings;
    SELECT COUNT(*) INTO user_place_ratings_populated FROM user_place_ratings WHERE google_place_id_temp IS NOT NULL;
    SELECT COUNT(*) INTO user_place_ratings_null FROM user_place_ratings WHERE google_place_id_temp IS NULL;
    
    RAISE NOTICE 'POST-MIGRATION VALIDATION:';
    RAISE NOTICE 'check_ins - Total: %, Populated: %, Null: %', check_ins_total, check_ins_populated, check_ins_null;
    RAISE NOTICE 'list_places - Total: %, Populated: %, Null: %', list_places_total, list_places_populated, list_places_null;
    RAISE NOTICE 'user_place_ratings - Total: %, Populated: %, Null: %', user_place_ratings_total, user_place_ratings_populated, user_place_ratings_null;
    
    -- Check for orphaned records (records that couldn't be matched)
    IF check_ins_null > 0 THEN
        RAISE WARNING 'Found % check_ins records that could not be matched to places table', check_ins_null;
    END IF;
    
    IF list_places_null > 0 THEN
        RAISE WARNING 'Found % list_places records that could not be matched to places table', list_places_null;
    END IF;
    
    IF user_place_ratings_null > 0 THEN
        RAISE WARNING 'Found % user_place_ratings records that could not be matched to places table', user_place_ratings_null;
    END IF;
    
    RAISE NOTICE 'Migration population completed successfully!';
END $$;

-- Additional validation: Check for any records with place_id but no google_place_id_temp
DO $$
DECLARE
    orphaned_check_ins INTEGER;
    orphaned_list_places INTEGER;
    orphaned_user_place_ratings INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_check_ins 
    FROM check_ins 
    WHERE place_id IS NOT NULL AND google_place_id_temp IS NULL;
    
    SELECT COUNT(*) INTO orphaned_list_places 
    FROM list_places 
    WHERE place_id IS NOT NULL AND google_place_id_temp IS NULL;
    
    SELECT COUNT(*) INTO orphaned_user_place_ratings 
    FROM user_place_ratings 
    WHERE place_id IS NOT NULL AND google_place_id_temp IS NULL;
    
    IF orphaned_check_ins > 0 OR orphaned_list_places > 0 OR orphaned_user_place_ratings > 0 THEN
        RAISE WARNING 'ORPHANED RECORDS DETECTED:';
        RAISE WARNING 'check_ins with place_id but no google_place_id_temp: %', orphaned_check_ins;
        RAISE WARNING 'list_places with place_id but no google_place_id_temp: %', orphaned_list_places;
        RAISE WARNING 'user_place_ratings with place_id but no google_place_id_temp: %', orphaned_user_place_ratings;
    ELSE
        RAISE NOTICE 'No orphaned records detected - all records with place_id have been successfully mapped!';
    END IF;
END $$;