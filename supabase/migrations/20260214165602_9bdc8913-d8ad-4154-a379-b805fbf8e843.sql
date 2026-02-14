
-- 1. UNIQUE constraint on NIF/CIF (case-insensitive, ignoring nulls)
CREATE UNIQUE INDEX idx_professionals_nif_unique 
ON public.professionals (LOWER(TRIM(nif_cif))) 
WHERE nif_cif IS NOT NULL AND nif_cif != '';

CREATE UNIQUE INDEX idx_professionals_company_cif_unique 
ON public.professionals (LOWER(TRIM(company_cif))) 
WHERE company_cif IS NOT NULL AND company_cif != '';

-- 2. Table to track banned identifiers
CREATE TABLE public.banned_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_type text NOT NULL,
  identifier_value text NOT NULL,
  original_professional_id uuid REFERENCES public.professionals(id),
  reason text NOT NULL DEFAULT 'permanent_ban_second_expulsion',
  banned_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_banned_identifiers_unique 
ON public.banned_identifiers (identifier_type, LOWER(TRIM(identifier_value)));

ALTER TABLE public.banned_identifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage banned identifiers"
ON public.banned_identifiers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Function to check if an identifier is banned
CREATE OR REPLACE FUNCTION public.is_identifier_banned(_type text, _value text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_identifiers
    WHERE identifier_type = _type AND LOWER(TRIM(identifier_value)) = LOWER(TRIM(_value))
  )
$$;

-- 4. Trigger: block registration if identifiers are banned
CREATE OR REPLACE FUNCTION public.check_banned_on_registration()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.nif_cif IS NOT NULL AND NEW.nif_cif != '' AND is_identifier_banned('nif', NEW.nif_cif) THEN
    RAISE EXCEPTION 'Este NIF/CIF está bloqueado permanentemente.';
  END IF;
  IF NEW.company_cif IS NOT NULL AND NEW.company_cif != '' AND is_identifier_banned('company_cif', NEW.company_cif) THEN
    RAISE EXCEPTION 'Este CIF de empresa está bloqueado permanentemente.';
  END IF;
  IF NEW.phone IS NOT NULL AND NEW.phone != '' AND is_identifier_banned('phone', NEW.phone) THEN
    RAISE EXCEPTION 'Este teléfono está asociado a una cuenta bloqueada.';
  END IF;
  IF NEW.email IS NOT NULL AND NEW.email != '' AND is_identifier_banned('email', NEW.email) THEN
    RAISE EXCEPTION 'Este email está asociado a una cuenta bloqueada.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_banned_on_registration
BEFORE INSERT ON public.professionals
FOR EACH ROW EXECUTE FUNCTION public.check_banned_on_registration();

-- 5. Trigger: on 2nd expulsion, auto-ban all identifiers permanently
CREATE OR REPLACE FUNCTION public.auto_ban_on_second_expulsion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.expulsion_count >= 2 AND (OLD.expulsion_count IS NULL OR OLD.expulsion_count < 2) THEN
    IF NEW.nif_cif IS NOT NULL AND NEW.nif_cif != '' THEN
      INSERT INTO public.banned_identifiers (identifier_type, identifier_value, original_professional_id, reason)
      VALUES ('nif', NEW.nif_cif, NEW.id, 'Segunda expulsión - ban permanente') ON CONFLICT DO NOTHING;
    END IF;
    IF NEW.company_cif IS NOT NULL AND NEW.company_cif != '' THEN
      INSERT INTO public.banned_identifiers (identifier_type, identifier_value, original_professional_id, reason)
      VALUES ('company_cif', NEW.company_cif, NEW.id, 'Segunda expulsión - ban permanente') ON CONFLICT DO NOTHING;
    END IF;
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
      INSERT INTO public.banned_identifiers (identifier_type, identifier_value, original_professional_id, reason)
      VALUES ('phone', NEW.phone, NEW.id, 'Segunda expulsión - ban permanente') ON CONFLICT DO NOTHING;
    END IF;
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
      INSERT INTO public.banned_identifiers (identifier_type, identifier_value, original_professional_id, reason)
      VALUES ('email', NEW.email, NEW.id, 'Segunda expulsión - ban permanente') ON CONFLICT DO NOTHING;
    END IF;
    NEW.status = 'expelled';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_ban_on_second_expulsion
BEFORE UPDATE OF expulsion_count ON public.professionals
FOR EACH ROW EXECUTE FUNCTION public.auto_ban_on_second_expulsion();

-- 6. Reentry eligibility check (6 months, max 1 expulsion)
CREATE OR REPLACE FUNCTION public.check_reentry_eligibility(_professional_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _prof RECORD;
  _months integer;
BEGIN
  SELECT expulsion_count, last_expulsion_at, status INTO _prof
  FROM public.professionals WHERE id = _professional_id;

  IF _prof IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Profesional no encontrado');
  END IF;

  IF _prof.expulsion_count >= 2 THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Ban permanente: segunda expulsión. No se admiten más reentradas.', 'permanent_ban', true);
  END IF;

  IF _prof.status != 'expelled' THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'El profesional no está expulsado');
  END IF;

  IF _prof.last_expulsion_at IS NOT NULL THEN
    _months := EXTRACT(EPOCH FROM (now() - _prof.last_expulsion_at)) / (60*60*24*30);
    IF _months < 6 THEN
      RETURN jsonb_build_object('eligible', false, 'reason', format('Debes esperar 6 meses. Faltan %s meses.', 6 - _months), 'months_remaining', 6 - _months, 'eligible_at', _prof.last_expulsion_at + interval '6 months');
    END IF;
  END IF;

  RETURN jsonb_build_object('eligible', true, 'reason', 'Elegible para solicitar readmisión');
END;
$$;

-- 7. Validate reentry request before insert
CREATE OR REPLACE FUNCTION public.validate_reentry_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _eligibility jsonb;
BEGIN
  _eligibility := check_reentry_eligibility(NEW.professional_id);
  IF NOT (_eligibility->>'eligible')::boolean THEN
    RAISE EXCEPTION '%', _eligibility->>'reason';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_reentry_request
BEFORE INSERT ON public.reentry_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_reentry_request();

-- 8. Red flags for duplicate detection
CREATE TABLE public.registration_red_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  new_professional_id uuid REFERENCES public.professionals(id),
  matched_professional_id uuid REFERENCES public.professionals(id),
  match_type text NOT NULL,
  match_detail text,
  is_reviewed boolean DEFAULT false,
  reviewed_by uuid REFERENCES public.professionals(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_red_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage red flags"
ON public.registration_red_flags FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. Auto-detect duplicates on new registration
CREATE OR REPLACE FUNCTION public.detect_registration_duplicates()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _match RECORD;
BEGIN
  FOR _match IN
    SELECT id, full_name FROM public.professionals
    WHERE phone = NEW.phone AND phone IS NOT NULL AND phone != ''
    AND id != NEW.id AND (status = 'expelled' OR expulsion_count > 0)
  LOOP
    INSERT INTO public.registration_red_flags (new_professional_id, matched_professional_id, match_type, match_detail)
    VALUES (NEW.id, _match.id, 'phone', format('Mismo teléfono que %s (expulsado)', _match.full_name));
  END LOOP;

  FOR _match IN
    SELECT id, full_name FROM public.professionals
    WHERE LOWER(TRIM(business_name)) = LOWER(TRIM(NEW.business_name))
    AND business_name IS NOT NULL AND business_name != ''
    AND id != NEW.id AND (status = 'expelled' OR expulsion_count > 0)
  LOOP
    INSERT INTO public.registration_red_flags (new_professional_id, matched_professional_id, match_type, match_detail)
    VALUES (NEW.id, _match.id, 'company', format('Misma empresa que %s (expulsado)', _match.full_name));
  END LOOP;

  FOR _match IN
    SELECT id, full_name FROM public.professionals
    WHERE LOWER(TRIM(address)) = LOWER(TRIM(NEW.address))
    AND address IS NOT NULL AND address != ''
    AND id != NEW.id AND (status = 'expelled' OR expulsion_count > 0)
  LOOP
    INSERT INTO public.registration_red_flags (new_professional_id, matched_professional_id, match_type, match_detail)
    VALUES (NEW.id, _match.id, 'address', format('Misma dirección que %s (expulsado)', _match.full_name));
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_registration_duplicates
AFTER INSERT ON public.professionals
FOR EACH ROW EXECUTE FUNCTION public.detect_registration_duplicates();
