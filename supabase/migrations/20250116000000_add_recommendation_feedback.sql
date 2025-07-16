-- Add recommendation feedback tracking tables
-- This migration adds support for tracking user feedback on recommendations

-- First, update the recommendation_requests table to store user preferences
ALTER TABLE recommendation_requests ADD COLUMN IF NOT EXISTS
  preferences JSONB DEFAULT '{}';

-- Create table to track individual recommendations shown to users
CREATE TABLE recommendation_instances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES recommendation_requests(id) ON DELETE CASCADE,
  google_place_id TEXT NOT NULL,
  position INT NOT NULL, -- Order shown (1, 2, 3, etc)
  score FLOAT, -- The recommendation score at time of display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table to track user feedback on recommendations
CREATE TABLE recommendation_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  instance_id UUID REFERENCES recommendation_instances(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('liked', 'disliked', 'viewed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent duplicate feedback entries
  UNIQUE(instance_id, user_id, action)
);

-- Add indexes for better query performance
CREATE INDEX idx_recommendation_instances_request ON recommendation_instances(request_id);
CREATE INDEX idx_recommendation_instances_place ON recommendation_instances(google_place_id);
CREATE INDEX idx_recommendation_feedback_user ON recommendation_feedback(user_id);
CREATE INDEX idx_recommendation_feedback_instance ON recommendation_feedback(instance_id);
CREATE INDEX idx_recommendation_feedback_action ON recommendation_feedback(action);

-- Enable Row Level Security
ALTER TABLE recommendation_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recommendation_instances
-- Users can only see instances from their own recommendation requests
CREATE POLICY "Users can view own recommendation instances" ON recommendation_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recommendation_requests
      WHERE recommendation_requests.id = recommendation_instances.request_id
      AND recommendation_requests.user_id = auth.uid()
    )
  );

-- Only the system can insert recommendation instances (via service role)
-- This prevents users from manipulating recommendation data

-- RLS Policies for recommendation_feedback
-- Users can only see their own feedback
CREATE POLICY "Users can view own feedback" ON recommendation_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON recommendation_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete feedback once given (immutable)
-- This ensures feedback integrity

-- Create a function to get recommendation feedback stats
CREATE OR REPLACE FUNCTION get_place_feedback_stats(place_id TEXT)
RETURNS TABLE (
  total_likes BIGINT,
  total_dislikes BIGINT,
  total_views BIGINT,
  like_ratio FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE rf.action = 'liked') as total_likes,
    COUNT(*) FILTER (WHERE rf.action = 'disliked') as total_dislikes,
    COUNT(*) FILTER (WHERE rf.action = 'viewed') as total_views,
    CASE 
      WHEN COUNT(*) FILTER (WHERE rf.action IN ('liked', 'disliked')) > 0
      THEN COUNT(*) FILTER (WHERE rf.action = 'liked')::FLOAT / 
           COUNT(*) FILTER (WHERE rf.action IN ('liked', 'disliked'))::FLOAT
      ELSE NULL
    END as like_ratio
  FROM recommendation_instances ri
  JOIN recommendation_feedback rf ON ri.id = rf.instance_id
  WHERE ri.google_place_id = place_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get user preference patterns
CREATE OR REPLACE FUNCTION get_user_preference_patterns(user_uuid UUID)
RETURNS TABLE (
  preference_type TEXT,
  liked_count BIGINT,
  disliked_count BIGINT,
  preference_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(rr.preferences->>'userPreference', 'any') as preference_type,
    COUNT(*) FILTER (WHERE rf.action = 'liked') as liked_count,
    COUNT(*) FILTER (WHERE rf.action = 'disliked') as disliked_count,
    CASE 
      WHEN COUNT(*) FILTER (WHERE rf.action IN ('liked', 'disliked')) > 0
      THEN COUNT(*) FILTER (WHERE rf.action = 'liked')::FLOAT / 
           COUNT(*) FILTER (WHERE rf.action IN ('liked', 'disliked'))::FLOAT
      ELSE 0.5
    END as preference_score
  FROM recommendation_requests rr
  JOIN recommendation_instances ri ON rr.id = ri.request_id
  JOIN recommendation_feedback rf ON ri.id = rf.instance_id
  WHERE rr.user_id = user_uuid
  GROUP BY rr.preferences->>'userPreference';
END;
$$ LANGUAGE plpgsql;