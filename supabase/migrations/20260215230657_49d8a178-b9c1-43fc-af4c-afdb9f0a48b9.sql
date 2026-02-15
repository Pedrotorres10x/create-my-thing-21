
-- Add close_initiated_by to track who started the close process
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS close_initiated_by UUID REFERENCES public.professionals(id);

-- Update the deal counters trigger to only fire on actual completion (both confirmed)
-- The existing trigger already checks for status = 'completed', so no changes needed there
