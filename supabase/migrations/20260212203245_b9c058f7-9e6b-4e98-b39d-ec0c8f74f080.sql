
-- Track progressive inactivity warnings before auto-expulsion
CREATE TABLE public.inactivity_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  warning_level integer NOT NULL DEFAULT 1, -- 1=3months, 2=4months, 3=5months, 4=6months(expulsion)
  warning_type text NOT NULL, -- 'first_warning', 'second_warning', 'final_warning', 'expulsion'
  message text NOT NULL,
  months_inactive integer NOT NULL,
  last_referral_given_at timestamptz, -- when they last gave a referral
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inactivity_warnings ENABLE ROW LEVEL SECURITY;

-- Users can see their own warnings
CREATE POLICY "Users can view own inactivity warnings"
  ON public.inactivity_warnings FOR SELECT
  USING (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

-- Users can mark as read
CREATE POLICY "Users can update own warnings"
  ON public.inactivity_warnings FOR UPDATE
  USING (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

-- Admins full access
CREATE POLICY "Admins can manage inactivity warnings"
  ON public.inactivity_warnings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role inserts
CREATE POLICY "Service can insert inactivity warnings"
  ON public.inactivity_warnings FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE INDEX idx_inactivity_warnings_professional ON public.inactivity_warnings(professional_id);
CREATE INDEX idx_inactivity_warnings_level ON public.inactivity_warnings(warning_level);
