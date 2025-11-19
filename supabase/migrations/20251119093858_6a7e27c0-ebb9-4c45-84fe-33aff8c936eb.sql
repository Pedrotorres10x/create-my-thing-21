-- Add birth_date field to professionals table
ALTER TABLE public.professionals 
ADD COLUMN birth_date DATE NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.professionals.birth_date IS 'User date of birth for age-based personalization';