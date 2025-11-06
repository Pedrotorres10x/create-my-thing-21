-- Add missing columns to professionals table
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Update existing records to copy data from old columns to new ones if needed
UPDATE public.professionals
SET 
  company_name = COALESCE(company_name, business_name),
  bio = COALESCE(bio, business_description),
  linkedin_url = COALESCE(linkedin_url, linkedin)
WHERE company_name IS NULL OR bio IS NULL OR linkedin_url IS NULL;