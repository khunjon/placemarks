-- Fix RLS policies for recommendation feedback system
-- This migration adds the missing INSERT policy for recommendation_instances

-- Allow users to insert instances for their own recommendation requests
CREATE POLICY "Users can insert own recommendation instances" 
ON recommendation_instances
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM recommendation_requests
    WHERE recommendation_requests.id = recommendation_instances.request_id
    AND recommendation_requests.user_id = auth.uid()
  )
);

-- Also ensure the recommendation_requests table has proper RLS policies
-- (in case they're missing from the initial migration)
ALTER TABLE recommendation_requests ENABLE ROW LEVEL SECURITY;

-- Ensure users can update their own recommendation requests
-- (needed for adding preferences after creation)
CREATE POLICY "Users can update own recommendation requests" 
ON recommendation_requests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);