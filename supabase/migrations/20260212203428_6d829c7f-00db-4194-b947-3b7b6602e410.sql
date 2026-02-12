
-- Replace the insert policy with one that blocks permanently banned users 
-- and enforces 6-month cooldown
DROP POLICY "Users can create reentry requests" ON public.reentry_requests;

CREATE POLICY "Users can create reentry requests if eligible"
  ON public.reentry_requests FOR INSERT
  WITH CHECK (
    professional_id IN (
      SELECT id FROM professionals 
      WHERE user_id = auth.uid() 
        AND expulsion_count < 2
        AND last_expulsion_at IS NOT NULL
        AND last_expulsion_at + interval '6 months' <= now()
    )
  );
