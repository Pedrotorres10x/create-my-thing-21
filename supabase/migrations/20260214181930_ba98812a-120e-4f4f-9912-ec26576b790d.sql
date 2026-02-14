-- Add professional_type column to distinguish autónomo from empresa
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS professional_type text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.professionals.professional_type IS 'autonomo or empresa';