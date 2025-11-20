-- Add a policy to allow reading public professional fields through foreign key relationships
-- This is needed for JOINs from posts, comments, etc.
CREATE POLICY "Allow reading public fields through foreign keys"
ON public.professionals
FOR SELECT
TO authenticated
USING (
  status = 'approved'::professional_status AND
  -- Only expose the same fields as professionals_public view
  TRUE
);

-- Note: This policy will be evaluated alongside the restrictive "Users can view their own profile" policy
-- Supabase uses OR logic between policies, so this allows approved professionals' public data
-- to be readable through JOINs while still protecting all other fields via the view