-- Make business_name nullable to allow transition to company_name
ALTER TABLE public.professionals 
ALTER COLUMN business_name DROP NOT NULL;