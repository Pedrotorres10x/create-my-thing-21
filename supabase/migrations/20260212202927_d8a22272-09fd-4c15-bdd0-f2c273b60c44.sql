
-- Red flag alerts table for AI-detected suspicious behavior
CREATE TABLE public.red_flag_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  alert_type text NOT NULL, -- 'referrals_no_deals', 'meetings_no_activity', 'ratio_imbalance', 'inactivity_post_referral'
  severity text NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  ai_analysis text NOT NULL, -- AI explanation of why this is suspicious
  ai_confidence numeric NOT NULL DEFAULT 0, -- 0-100 confidence score
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb, -- Raw data supporting the alert
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'confirmed', 'dismissed'
  admin_notes text,
  reviewed_by uuid REFERENCES public.professionals(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.red_flag_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can see and manage red flag alerts
CREATE POLICY "Admins can view all red flags"
  ON public.red_flag_alerts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update red flags"
  ON public.red_flag_alerts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete red flags"
  ON public.red_flag_alerts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role inserts (from edge function)
CREATE POLICY "Service can insert red flags"
  ON public.red_flag_alerts FOR INSERT
  WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX idx_red_flag_alerts_professional ON public.red_flag_alerts(professional_id);
CREATE INDEX idx_red_flag_alerts_status ON public.red_flag_alerts(status);

-- Trigger for updated_at
CREATE TRIGGER update_red_flag_alerts_updated_at
  BEFORE UPDATE ON public.red_flag_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
