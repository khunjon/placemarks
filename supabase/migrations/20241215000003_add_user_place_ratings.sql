-- Create user place ratings table for personal ratings separate from check-ins
CREATE TABLE user_place_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  rating_type TEXT NOT NULL CHECK (rating_type IN ('thumbs_up', 'thumbs_down', 'neutral')),
  rating_value INTEGER CHECK (rating_value >= 1 AND rating_value <= 5), -- Optional numeric rating
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one rating per user per place
  UNIQUE(user_id, place_id)
);

-- Create indexes
CREATE INDEX idx_user_place_ratings_user_id ON user_place_ratings (user_id);
CREATE INDEX idx_user_place_ratings_place_id ON user_place_ratings (place_id);
CREATE INDEX idx_user_place_ratings_rating_type ON user_place_ratings (rating_type);

-- Enable RLS
ALTER TABLE user_place_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own ratings" ON user_place_ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ratings" ON user_place_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON user_place_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON user_place_ratings FOR DELETE USING (auth.uid() = user_id);

-- Function to upsert user rating
CREATE OR REPLACE FUNCTION upsert_user_place_rating(
  p_user_id UUID,
  p_place_id UUID,
  p_rating_type TEXT,
  p_rating_value INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS user_place_ratings AS $$
DECLARE
  result user_place_ratings;
BEGIN
  INSERT INTO user_place_ratings (user_id, place_id, rating_type, rating_value, notes, updated_at)
  VALUES (p_user_id, p_place_id, p_rating_type, p_rating_value, p_notes, NOW())
  ON CONFLICT (user_id, place_id)
  DO UPDATE SET 
    rating_type = EXCLUDED.rating_type,
    rating_value = EXCLUDED.rating_value,
    notes = EXCLUDED.notes,
    updated_at = NOW()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user rating for a place
CREATE OR REPLACE FUNCTION get_user_place_rating(p_user_id UUID, p_place_id UUID)
RETURNS user_place_ratings AS $$
DECLARE
  result user_place_ratings;
BEGIN
  SELECT * INTO result
  FROM user_place_ratings
  WHERE user_id = p_user_id AND place_id = p_place_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 