
-- Track expulsion history and reentry requests
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS expulsion_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS last_expulsion_at timestamptz;

-- Reentry requests table
CREATE TABLE public.reentry_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'blocked'
  admin_notes text,
  reviewed_by uuid REFERENCES public.professionals(id),
  reviewed_at timestamptz,
  eligible_at timestamptz NOT NULL, -- when they become eligible (6 months after expulsion)
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reentry_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reentry requests"
  ON public.reentry_requests FOR SELECT
  USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Users can create reentry requests"
  ON public.reentry_requests FOR INSERT
  WITH CHECK (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage reentry requests"
  ON public.reentry_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
