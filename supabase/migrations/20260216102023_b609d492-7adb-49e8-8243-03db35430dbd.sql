
-- Admin notifications table for flagged content
CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type text NOT NULL, -- 'profile_audit', 'content_moderation', 'spam_detected'
  title text NOT NULL,
  description text,
  related_professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  related_audit_id uuid REFERENCES public.profile_audit_logs(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'medium',
  is_read boolean NOT NULL DEFAULT false,
  read_by uuid REFERENCES auth.users(id),
  read_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications(is_read, created_at DESC) WHERE is_read = false;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notifications"
ON public.admin_notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notifications"
ON public.admin_notifications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
