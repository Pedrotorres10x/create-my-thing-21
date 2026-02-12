-- Make fields nullable for minimal signup flow
-- Users will complete these later via Alic.ia onboarding

ALTER TABLE public.professionals 
  ALTER COLUMN sector_id DROP NOT NULL,
  ALTER COLUMN specialization_id DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN state DROP NOT NULL;

-- Set defaults so minimal inserts work
ALTER TABLE public.professionals 
  ALTER COLUMN sector_id SET DEFAULT NULL,
  ALTER COLUMN specialization_id SET DEFAULT NULL,
  ALTER COLUMN city SET DEFAULT '',
  ALTER COLUMN state SET DEFAULT '';