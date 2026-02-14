
-- =============================================
-- THANKS SYSTEM: Sectors, Bands, Deals evolution
-- =============================================

-- 1) Sectors table (admin-managed coefficients)
CREATE TABLE public.thanks_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  internal_coefficient_type text NOT NULL DEFAULT 'percent', -- percent, multiplier_months, fixed_ratio
  internal_coefficient_value numeric NOT NULL DEFAULT 0.10,
  internal_coefficient_min numeric DEFAULT 0.05,
  internal_coefficient_max numeric DEFAULT 0.30,
  notes_internal text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.thanks_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sectors" ON public.thanks_sectors
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage sectors" ON public.thanks_sectors
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 2) Category Bands (10 tramos, admin-editable)
CREATE TABLE public.thanks_category_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_number integer NOT NULL UNIQUE,
  display_label text NOT NULL,
  internal_min_estimated_income numeric NOT NULL,
  internal_max_estimated_income numeric NOT NULL,
  min_thanks_amount numeric NOT NULL,
  recommended_thanks_amount numeric NOT NULL,
  max_thanks_amount numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.thanks_category_bands ENABLE ROW LEVEL SECURITY;

-- Users see only display_label and amounts (enforced in frontend)
CREATE POLICY "Authenticated can view bands" ON public.thanks_category_bands
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage bands" ON public.thanks_category_bands
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 3) Extend deals table with thanks columns
ALTER TABLE public.deals
  ADD COLUMN sector_id uuid REFERENCES public.thanks_sectors(id),
  ADD COLUMN estimated_total_volume numeric,
  ADD COLUMN thanks_band_id uuid REFERENCES public.thanks_category_bands(id),
  ADD COLUMN thanks_estimated_income_internal numeric,  -- hidden from user
  ADD COLUMN thanks_amount_selected numeric,
  ADD COLUMN thanks_amount_status text NOT NULL DEFAULT 'none', -- none, proposed, accepted, rejected, paid, failed
  ADD COLUMN thanks_proposed_at timestamptz,
  ADD COLUMN thanks_accepted_at timestamptz,
  ADD COLUMN thanks_paid_at timestamptz,
  ADD COLUMN thanks_comment text,
  ADD COLUMN thanks_band_version text DEFAULT 'v1';

-- 4) Disagreements table
CREATE TABLE public.deal_disagreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  opened_by_id uuid NOT NULL REFERENCES public.professionals(id),
  reason text NOT NULL, -- value_not_reflected, partial_scope, different_margin_model, other
  comment text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open, resolved, rejected
  resolution_type text, -- band_adjusted, amount_adjusted, no_change
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.professionals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_disagreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal parties can view disagreements" ON public.deal_disagreements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN professionals p ON p.user_id = auth.uid()
      WHERE d.id = deal_disagreements.deal_id
        AND (p.id = d.referrer_id OR p.id = d.receiver_id)
    )
  );

CREATE POLICY "Deal parties can create disagreements" ON public.deal_disagreements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals d
      JOIN professionals p ON p.user_id = auth.uid()
      WHERE d.id = deal_disagreements.deal_id
        AND (p.id = d.referrer_id OR p.id = d.receiver_id)
        AND p.id = deal_disagreements.opened_by_id
    )
  );

CREATE POLICY "Admins can manage disagreements" ON public.deal_disagreements
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 5) Reputation metrics (aggregated per user)
CREATE TABLE public.thanks_reputation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL UNIQUE REFERENCES public.professionals(id),
  generosity_index numeric NOT NULL DEFAULT 1.0,
  avg_thanks_vs_recommended numeric NOT NULL DEFAULT 1.0,
  payment_speed_avg_hours numeric NOT NULL DEFAULT 0,
  disagreement_rate numeric NOT NULL DEFAULT 0,
  underpay_flags_count integer NOT NULL DEFAULT 0,
  total_thanks_given integer NOT NULL DEFAULT 0,
  total_thanks_received integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.thanks_reputation_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reputation" ON public.thanks_reputation_metrics
  FOR SELECT USING (
    professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage reputation" ON public.thanks_reputation_metrics
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 6) DB function: assign band based on sector + volume
CREATE OR REPLACE FUNCTION public.assign_thanks_band(
  _sector_id uuid,
  _estimated_total_volume numeric
)
RETURNS TABLE(
  band_id uuid,
  display_label text,
  min_amount numeric,
  recommended_amount numeric,
  max_amount numeric,
  estimated_income_internal numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sector thanks_sectors%ROWTYPE;
  _income numeric;
BEGIN
  SELECT * INTO _sector FROM thanks_sectors WHERE id = _sector_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sector not found';
  END IF;

  -- Calculate internal estimated income
  CASE _sector.internal_coefficient_type
    WHEN 'percent' THEN
      _income := _estimated_total_volume * _sector.internal_coefficient_value;
    WHEN 'multiplier_months' THEN
      _income := _estimated_total_volume * _sector.internal_coefficient_value;
    WHEN 'fixed_ratio' THEN
      _income := _estimated_total_volume * _sector.internal_coefficient_value;
    ELSE
      _income := _estimated_total_volume * 0.10;
  END CASE;

  RETURN QUERY
  SELECT 
    b.id,
    b.display_label,
    b.min_thanks_amount,
    b.recommended_thanks_amount,
    b.max_thanks_amount,
    _income
  FROM thanks_category_bands b
  WHERE b.is_active = true
    AND _income >= b.internal_min_estimated_income
    AND _income < b.internal_max_estimated_income
  ORDER BY b.band_number ASC
  LIMIT 1;

  -- If no band matched (income too high), return the highest band
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      b.id,
      b.display_label,
      b.min_thanks_amount,
      b.recommended_thanks_amount,
      b.max_thanks_amount,
      _income
    FROM thanks_category_bands b
    WHERE b.is_active = true
    ORDER BY b.band_number DESC
    LIMIT 1;
  END IF;
END;
$$;

-- 7) Seed 10 bands
INSERT INTO public.thanks_category_bands (band_number, display_label, internal_min_estimated_income, internal_max_estimated_income, min_thanks_amount, recommended_thanks_amount, max_thanks_amount) VALUES
  (1, 'Categoría 1', 0, 500, 100, 120, 150),
  (2, 'Categoría 2', 500, 1500, 150, 200, 250),
  (3, 'Categoría 3', 1500, 3000, 250, 350, 450),
  (4, 'Categoría 4', 3000, 5000, 400, 550, 700),
  (5, 'Categoría 5', 5000, 8000, 500, 650, 800),
  (6, 'Categoría 6', 8000, 12000, 650, 800, 1000),
  (7, 'Categoría 7', 12000, 18000, 800, 1000, 1200),
  (8, 'Categoría 8', 18000, 25000, 1000, 1200, 1450),
  (9, 'Categoría 9', 25000, 35000, 1150, 1400, 1700),
  (10, 'Categoría 10', 35000, 999999999, 1300, 1600, 2000);

-- 8) Seed initial sectors
INSERT INTO public.thanks_sectors (name, internal_coefficient_type, internal_coefficient_value, notes_internal) VALUES
  ('Inmobiliaria', 'percent', 0.035, 'Comisión típica agencia 3-5%'),
  ('Seguros', 'percent', 0.15, 'Comisión media corredor 10-20%'),
  ('Abogacía', 'percent', 0.25, 'Honorarios sobre valor del caso'),
  ('Consultoría', 'percent', 0.30, 'Margen típico consultoría'),
  ('Marketing Digital', 'percent', 0.20, 'Fee sobre presupuesto gestionado'),
  ('Reformas / Construcción', 'percent', 0.12, 'Margen constructor 8-15%'),
  ('Contabilidad / Asesoría Fiscal', 'percent', 0.40, 'Margen alto en servicios recurrentes'),
  ('Diseño / Arquitectura', 'percent', 0.25, 'Honorarios sobre proyecto'),
  ('Tecnología / Software', 'percent', 0.35, 'Margen alto en desarrollo'),
  ('Salud / Bienestar', 'percent', 0.30, 'Margen servicios de salud'),
  ('Formación / Coaching', 'percent', 0.40, 'Alto margen en servicios de conocimiento'),
  ('Otro', 'percent', 0.15, 'Coeficiente genérico');

-- 9) Trigger to update deals status when disagreement opens
CREATE OR REPLACE FUNCTION public.handle_deal_disagreement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE deals
    SET status = 'disputed',
        thanks_amount_status = 'rejected'
    WHERE id = NEW.deal_id
      AND status IN ('completed', 'pending');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_deal_disagreement_created
  AFTER INSERT ON public.deal_disagreements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_deal_disagreement();
