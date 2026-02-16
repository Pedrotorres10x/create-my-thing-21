
-- Table already partially created from failed migrations, recreate cleanly
CREATE TABLE IF NOT EXISTS public.profile_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  audit_type text NOT NULL,
  field_name text,
  flagged_content text,
  severity text NOT NULL DEFAULT 'low',
  reason text,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES public.professionals(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_audit_professional ON public.profile_audit_logs(professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_audit_unresolved ON public.profile_audit_logs(is_resolved, created_at DESC) WHERE is_resolved = false;

ALTER TABLE public.profile_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any from failed attempts
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.profile_audit_logs;
DROP POLICY IF EXISTS "Admins can update audit logs" ON public.profile_audit_logs;

-- Only admins (via user_roles table) can read/manage audit logs
CREATE POLICY "Admins can view audit logs"
ON public.profile_audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update audit logs"
ON public.profile_audit_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add columns for audit tracking
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS last_profile_audited_at timestamptz;

ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS profile_updated_at timestamptz DEFAULT now();

-- Trigger to track profile text changes
CREATE OR REPLACE FUNCTION public.track_profile_text_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF (OLD.full_name IS DISTINCT FROM NEW.full_name)
    OR (OLD.company_name IS DISTINCT FROM NEW.company_name)
    OR (OLD.position IS DISTINCT FROM NEW.position)
    OR (OLD.bio IS DISTINCT FROM NEW.bio)
    OR (OLD.business_description IS DISTINCT FROM NEW.business_description)
  THEN
    NEW.profile_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_track_profile_changes ON public.professionals;
CREATE TRIGGER trigger_track_profile_changes
BEFORE UPDATE ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.track_profile_text_changes();
