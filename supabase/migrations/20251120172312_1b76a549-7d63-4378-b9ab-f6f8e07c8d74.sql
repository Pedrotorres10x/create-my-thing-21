-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Allow reading public fields through foreign keys" ON public.professionals;

-- The solution is to use the professionals_public view for all public-facing queries
-- and keep the professionals table strictly locked down
-- No additional policies needed - the existing "Users can view their own profile" policy is correct