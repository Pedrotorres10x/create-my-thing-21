-- Add missing fields for complete professional registration
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS nif_cif TEXT,
ADD COLUMN IF NOT EXISTS registration_type TEXT CHECK (registration_type IN ('autonomo', 'empresa')),
ADD COLUMN IF NOT EXISTS company_cif TEXT,
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person_position TEXT,
ADD COLUMN IF NOT EXISTS contact_person_phone TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.professionals.nif_cif IS 'NIF para autónomos o NIF de persona de contacto para empresas';
COMMENT ON COLUMN public.professionals.registration_type IS 'Tipo de registro: autonomo o empresa';
COMMENT ON COLUMN public.professionals.company_cif IS 'CIF de la empresa (solo para tipo empresa)';
COMMENT ON COLUMN public.professionals.company_address IS 'Dirección fiscal de la empresa (solo para tipo empresa)';
COMMENT ON COLUMN public.professionals.contact_person_name IS 'Nombre completo de persona de contacto (solo para tipo empresa)';
COMMENT ON COLUMN public.professionals.contact_person_position IS 'Cargo de persona de contacto (solo para tipo empresa)';
COMMENT ON COLUMN public.professionals.contact_person_phone IS 'Teléfono directo de persona de contacto (solo para tipo empresa)';

-- Make some fields required
ALTER TABLE public.professionals
ALTER COLUMN phone SET NOT NULL;

-- Add validation function for Spanish NIF/CIF format
CREATE OR REPLACE FUNCTION public.validate_spanish_nif_cif(nif_cif TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Basic Spanish NIF/CIF validation
  -- NIF: 8 digits + letter (e.g., 12345678Z)
  -- CIF: letter + 7 digits + letter (e.g., A12345678)
  RETURN nif_cif ~ '^[0-9]{8}[A-Z]$' OR nif_cif ~ '^[A-Z][0-9]{7}[A-Z0-9]$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;