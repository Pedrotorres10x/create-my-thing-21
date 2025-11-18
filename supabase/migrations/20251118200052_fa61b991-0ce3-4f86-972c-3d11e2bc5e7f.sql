-- Fix search_path for validation function
DROP FUNCTION IF EXISTS public.validate_spanish_nif_cif(TEXT);

CREATE OR REPLACE FUNCTION public.validate_spanish_nif_cif(nif_cif TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Basic Spanish NIF/CIF validation
  -- NIF: 8 digits + letter (e.g., 12345678Z)
  -- CIF: letter + 7 digits + letter (e.g., A12345678)
  RETURN nif_cif ~ '^[0-9]{8}[A-Z]$' OR nif_cif ~ '^[A-Z][0-9]{7}[A-Z0-9]$';
END;
$$;