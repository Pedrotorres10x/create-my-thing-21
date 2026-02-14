
-- Table: referral_band_assignments (auditoría de asignación de tramo)
CREATE TABLE public.referral_band_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  category_band_id UUID NOT NULL REFERENCES public.thanks_category_bands(id),
  estimated_income_internal NUMERIC,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_version TEXT NOT NULL DEFAULT 'v1',
  is_overridden BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  overridden_by TEXT CHECK (overridden_by IN ('system', 'user_request', 'admin'))
);

-- Enable RLS
ALTER TABLE public.referral_band_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage band assignments"
ON public.referral_band_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Deal parties can view band assignments"
ON public.referral_band_assignments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM deals d
  JOIN professionals p ON p.user_id = auth.uid()
  WHERE d.id = referral_band_assignments.deal_id
    AND (p.id = d.referrer_id OR p.id = d.receiver_id)
));

-- Auto-insert assignment when deal gets a band assigned
CREATE OR REPLACE FUNCTION public.track_band_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.thanks_band_id IS NOT NULL AND (OLD.thanks_band_id IS NULL OR OLD.thanks_band_id IS DISTINCT FROM NEW.thanks_band_id) THEN
    INSERT INTO referral_band_assignments (deal_id, category_band_id, estimated_income_internal, assigned_version)
    VALUES (NEW.id, NEW.thanks_band_id, NEW.thanks_estimated_income_internal, COALESCE(NEW.thanks_band_version, 'v1'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_track_band_assignment
AFTER UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.track_band_assignment();
