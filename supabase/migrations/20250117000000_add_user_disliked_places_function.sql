-- Add optimized function to get user's disliked places
-- This function returns all Google Place IDs that a user has disliked

CREATE OR REPLACE FUNCTION get_user_disliked_places(user_uuid UUID)
RETURNS TABLE (
  google_place_id TEXT,
  disliked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    ri.google_place_id,
    rf.created_at as disliked_at
  FROM recommendation_feedback rf
  JOIN recommendation_instances ri ON rf.instance_id = ri.id
  WHERE rf.user_id = user_uuid
    AND rf.action = 'disliked'
  ORDER BY rf.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add index for better performance on the feedback lookups
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_action 
  ON recommendation_feedback(user_id, action) 
  WHERE action = 'disliked';

-- Add function to clear user's recommendation feedback
-- This can be called from settings if users want to reset their preferences
CREATE OR REPLACE FUNCTION clear_user_recommendation_feedback(
  user_uuid UUID,
  feedback_type TEXT DEFAULT 'all' -- 'all', 'liked', 'disliked'
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF feedback_type = 'all' THEN
    DELETE FROM recommendation_feedback
    WHERE user_id = user_uuid;
  ELSE
    DELETE FROM recommendation_feedback
    WHERE user_id = user_uuid AND action = feedback_type;
  END IF;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_disliked_places(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_user_recommendation_feedback(UUID, TEXT) TO authenticated;