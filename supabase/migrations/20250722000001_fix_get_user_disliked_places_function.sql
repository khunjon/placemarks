-- Fix get_user_disliked_places function
-- This migration corrects column references that were broken in the search path fix migration

DROP FUNCTION IF EXISTS public.get_user_disliked_places(uuid);

CREATE OR REPLACE FUNCTION public.get_user_disliked_places(p_user_id uuid)
RETURNS TABLE(google_place_id text)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        ri.google_place_id
    FROM recommendation_instances ri
    JOIN recommendation_feedback rf ON ri.id = rf.instance_id
    WHERE rf.user_id = p_user_id
      AND rf.action = 'disliked'
      AND rf.created_at > NOW() - INTERVAL '30 days';
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_disliked_places(UUID) TO authenticated;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully fixed get_user_disliked_places function with correct column references';
END $$;