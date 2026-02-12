
-- Fix: restrict INSERT to service role only (no anon inserts)
DROP POLICY "Service can insert red flags" ON public.red_flag_alerts;

-- Only allow inserts when there's no authenticated user (service role context)
CREATE POLICY "Only service role can insert red flags"
  ON public.red_flag_alerts FOR INSERT
  WITH CHECK (auth.uid() IS NULL);
