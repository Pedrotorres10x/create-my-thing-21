-- Drop the existing policy that allows users to view their own entries
DROP POLICY IF EXISTS "Users can view their own waitlist entry" ON public.marketplace_waitlist;

-- Create admin-only SELECT policy
CREATE POLICY "Only admins can view waitlist entries"
ON public.marketplace_waitlist
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update INSERT policy to ensure professional_id is always set
DROP POLICY IF EXISTS "Authenticated users can join waitlist" ON public.marketplace_waitlist;

CREATE POLICY "Authenticated users can join waitlist"
ON public.marketplace_waitlist
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (professional_id IS NULL OR professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
);