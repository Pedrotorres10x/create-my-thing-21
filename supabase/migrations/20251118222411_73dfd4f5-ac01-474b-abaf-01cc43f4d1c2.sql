-- Create behavioral tracking table
CREATE TABLE IF NOT EXISTS public.user_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'offer_view',
    'offer_contact',
    'message_sent',
    'profile_view',
    'contact_info_shared',
    'price_discussed',
    'rapid_messaging',
    'external_link_shared'
  )),
  context_id UUID,
  metadata JSONB DEFAULT '{}',
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create behavioral risk scores table
CREATE TABLE IF NOT EXISTS public.behavioral_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL UNIQUE REFERENCES public.professionals(id) ON DELETE CASCADE,
  overall_risk_score INTEGER DEFAULT 0 CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  risk_factors JSONB DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  alert_threshold_reached BOOLEAN DEFAULT false,
  last_alert_sent TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_risk_scores ENABLE ROW LEVEL SECURITY;

-- Admins can view all behavior events
CREATE POLICY "Admins can view all behavior events"
ON public.user_behavior_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can view all risk scores
CREATE POLICY "Admins can view all risk scores"
ON public.behavioral_risk_scores
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update risk scores
CREATE POLICY "Admins can update risk scores"
ON public.behavioral_risk_scores
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_behavior_events_professional ON public.user_behavior_events(professional_id, created_at DESC);
CREATE INDEX idx_behavior_events_type ON public.user_behavior_events(event_type);
CREATE INDEX idx_behavior_events_created ON public.user_behavior_events(created_at);
CREATE INDEX idx_risk_scores_threshold ON public.behavioral_risk_scores(alert_threshold_reached) WHERE alert_threshold_reached = true;