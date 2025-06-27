-- Add temporary google_place_id columns to tables that reference places by UUID
-- These will be populated from the existing places table mapping, then the old place_id columns will be dropped

-- Add temporary google_place_id column to check_ins table
ALTER TABLE check_ins ADD COLUMN google_place_id_temp TEXT;

-- Add temporary google_place_id column to list_places table
ALTER TABLE list_places ADD COLUMN google_place_id_temp TEXT;

-- Add temporary google_place_id column to user_place_ratings table
ALTER TABLE user_place_ratings ADD COLUMN google_place_id_temp TEXT;

-- Create indexes on the temporary columns for performance during migration
CREATE INDEX idx_check_ins_google_place_id_temp ON check_ins(google_place_id_temp);
CREATE INDEX idx_list_places_google_place_id_temp ON list_places(google_place_id_temp);
CREATE INDEX idx_user_place_ratings_google_place_id_temp ON user_place_ratings(google_place_id_temp);