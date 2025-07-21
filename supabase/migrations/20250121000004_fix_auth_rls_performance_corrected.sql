-- Fix Auth RLS Performance Issues (Corrected)
-- Replace auth.uid() with (select auth.uid()) in all RLS policies for better performance
-- This prevents re-evaluation of auth.uid() for each row

-- 1. Fix check_ins policies
DROP POLICY IF EXISTS "Users can delete own check-ins" ON check_ins;
DROP POLICY IF EXISTS "Users can insert own check-ins" ON check_ins;
DROP POLICY IF EXISTS "Users can update own check-ins" ON check_ins;
DROP POLICY IF EXISTS "Users can view own check-ins" ON check_ins;

CREATE POLICY "Users can delete own check-ins"
  ON check_ins
  FOR DELETE
  TO public
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own check-ins"
  ON check_ins
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own check-ins"
  ON check_ins
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view own check-ins"
  ON check_ins
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

-- 2. Fix users policies (uses id column, not user_id)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = id);

-- 3. Fix lists policies
DROP POLICY IF EXISTS "Users can view own lists" ON lists;
DROP POLICY IF EXISTS "Users can insert own lists" ON lists;
DROP POLICY IF EXISTS "Users can update own lists" ON lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON lists;
DROP POLICY IF EXISTS "Authenticated users can manage curated lists" ON lists;

CREATE POLICY "Users can view own lists"
  ON lists
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own lists"
  ON lists
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own lists"
  ON lists
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own lists"
  ON lists
  FOR DELETE
  TO public
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Authenticated users can manage curated lists"
  ON lists
  FOR ALL
  TO authenticated
  USING (((is_curated = true) AND ((SELECT auth.uid()) IS NOT NULL)) OR ((is_curated = false) AND ((SELECT auth.uid()) = user_id)))
  WITH CHECK (((is_curated = true) AND ((SELECT auth.uid()) IS NOT NULL)) OR ((is_curated = false) AND ((SELECT auth.uid()) = user_id)));

-- 4. Fix list_places policies (uses relationship through lists)
DROP POLICY IF EXISTS "Users can view own list places" ON list_places;
DROP POLICY IF EXISTS "Users can insert own list places" ON list_places;
DROP POLICY IF EXISTS "Users can update own list places" ON list_places;
DROP POLICY IF EXISTS "Users can delete own list places" ON list_places;

CREATE POLICY "Users can view own list places"
  ON list_places
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1
    FROM lists
    WHERE lists.id = list_places.list_id 
    AND lists.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can insert own list places"
  ON list_places
  FOR INSERT
  TO public
  WITH CHECK (EXISTS (
    SELECT 1
    FROM lists
    WHERE lists.id = list_places.list_id 
    AND lists.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can update own list places"
  ON list_places
  FOR UPDATE
  TO public
  USING (EXISTS (
    SELECT 1
    FROM lists
    WHERE lists.id = list_places.list_id 
    AND lists.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM lists
    WHERE lists.id = list_places.list_id 
    AND lists.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can delete own list places"
  ON list_places
  FOR DELETE
  TO public
  USING (EXISTS (
    SELECT 1
    FROM lists
    WHERE lists.id = list_places.list_id 
    AND lists.user_id = (SELECT auth.uid())
  ));

-- 5. Fix places policies (simple auth check, no user ownership)
DROP POLICY IF EXISTS "Users can insert their own places" ON places;

CREATE POLICY "Users can insert their own places"
  ON places
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- 6. Fix editorial_places policies (admin role check)
DROP POLICY IF EXISTS "Admin read access for editorial_places" ON editorial_places;
DROP POLICY IF EXISTS "Admin insert access for editorial_places" ON editorial_places;
DROP POLICY IF EXISTS "Admin update access for editorial_places" ON editorial_places;
DROP POLICY IF EXISTS "Admin delete access for editorial_places" ON editorial_places;

CREATE POLICY "Admin read access for editorial_places"
  ON editorial_places
  FOR SELECT
  TO public
  USING (((SELECT auth.uid()) IS NOT NULL) AND (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = (SELECT auth.uid()) 
    AND (users.preferences ->> 'role'::text) = 'admin'::text
  )));

CREATE POLICY "Admin insert access for editorial_places"
  ON editorial_places
  FOR INSERT
  TO public
  WITH CHECK (((SELECT auth.uid()) IS NOT NULL) AND (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = (SELECT auth.uid()) 
    AND (users.preferences ->> 'role'::text) = 'admin'::text
  )));

CREATE POLICY "Admin update access for editorial_places"
  ON editorial_places
  FOR UPDATE
  TO public
  USING (((SELECT auth.uid()) IS NOT NULL) AND (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = (SELECT auth.uid()) 
    AND (users.preferences ->> 'role'::text) = 'admin'::text
  )))
  WITH CHECK (((SELECT auth.uid()) IS NOT NULL) AND (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = (SELECT auth.uid()) 
    AND (users.preferences ->> 'role'::text) = 'admin'::text
  )));

CREATE POLICY "Admin delete access for editorial_places"
  ON editorial_places
  FOR DELETE
  TO public
  USING (((SELECT auth.uid()) IS NOT NULL) AND (EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = (SELECT auth.uid()) 
    AND (users.preferences ->> 'role'::text) = 'admin'::text
  )));

-- 7. Fix recommendation_requests policies
DROP POLICY IF EXISTS "Users can view own recommendations" ON recommendation_requests;
DROP POLICY IF EXISTS "Users can insert own recommendations" ON recommendation_requests;
DROP POLICY IF EXISTS "Users can update own recommendations" ON recommendation_requests;
DROP POLICY IF EXISTS "Users can update own recommendation requests" ON recommendation_requests;

CREATE POLICY "Users can view own recommendations"
  ON recommendation_requests
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own recommendations"
  ON recommendation_requests
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own recommendation requests"
  ON recommendation_requests
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id);

-- 8. Fix recommendation_instances policies (uses relationship through recommendation_requests)
DROP POLICY IF EXISTS "Users can view own recommendation instances" ON recommendation_instances;
DROP POLICY IF EXISTS "Users can insert own recommendation instances" ON recommendation_instances;

CREATE POLICY "Users can view own recommendation instances"
  ON recommendation_instances
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1
    FROM recommendation_requests
    WHERE recommendation_requests.id = recommendation_instances.request_id 
    AND recommendation_requests.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can insert own recommendation instances"
  ON recommendation_instances
  FOR INSERT
  TO public
  WITH CHECK (EXISTS (
    SELECT 1
    FROM recommendation_requests
    WHERE recommendation_requests.id = recommendation_instances.request_id 
    AND recommendation_requests.user_id = (SELECT auth.uid())
  ));

-- 9. Fix recommendation_feedback policies
DROP POLICY IF EXISTS "Users can view own feedback" ON recommendation_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON recommendation_feedback;

CREATE POLICY "Users can view own feedback"
  ON recommendation_feedback
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own feedback"
  ON recommendation_feedback
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 10. Fix user_place_ratings policies
DROP POLICY IF EXISTS "Users can view own ratings" ON user_place_ratings;
DROP POLICY IF EXISTS "Users can insert own ratings" ON user_place_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON user_place_ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON user_place_ratings;

CREATE POLICY "Users can view own ratings"
  ON user_place_ratings
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own ratings"
  ON user_place_ratings
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own ratings"
  ON user_place_ratings
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own ratings"
  ON user_place_ratings
  FOR DELETE
  TO public
  USING ((SELECT auth.uid()) = user_id);

-- 11. Fix user_recommendation_preferences policies
DROP POLICY IF EXISTS "Users can manage their own recommendation preferences" ON user_recommendation_preferences;

CREATE POLICY "Users can manage their own recommendation preferences"
  ON user_recommendation_preferences
  FOR ALL
  TO public
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully optimized RLS policies for auth.uid() performance';
    RAISE NOTICE 'All policies now use (select auth.uid()) for better query performance';
END $$;