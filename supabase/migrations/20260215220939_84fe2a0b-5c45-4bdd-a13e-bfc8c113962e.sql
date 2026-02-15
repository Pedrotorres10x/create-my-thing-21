-- Add missing FK from professionals to specializations
ALTER TABLE public.professionals
ADD CONSTRAINT professionals_specialization_id_fkey
FOREIGN KEY (specialization_id) REFERENCES public.specializations(id);