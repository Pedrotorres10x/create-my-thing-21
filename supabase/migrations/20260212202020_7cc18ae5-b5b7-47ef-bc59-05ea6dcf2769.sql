
-- Table to store auto-generated VAPID keys
CREATE TABLE public.vapid_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  public_key text NOT NULL,
  private_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vapid_keys ENABLE ROW LEVEL SECURITY;

-- Only service role can access VAPID keys (edge functions)
-- No public policies needed

-- Table to store user push subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(professional_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (professional_id IN (
  SELECT id FROM professionals WHERE user_id = auth.uid()
))
WITH CHECK (professional_id IN (
  SELECT id FROM professionals WHERE user_id = auth.uid()
));

-- Table for notification log
CREATE TABLE public.push_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  notification_type text NOT NULL DEFAULT 'engagement',
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  clicked_at timestamp with time zone,
  url text
);

ALTER TABLE public.push_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification log"
ON public.push_notification_log
FOR SELECT
USING (professional_id IN (
  SELECT id FROM professionals WHERE user_id = auth.uid()
));
