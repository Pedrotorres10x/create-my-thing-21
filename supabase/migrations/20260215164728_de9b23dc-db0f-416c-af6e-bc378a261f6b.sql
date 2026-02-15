-- Add missing FK between professionals.sector_id and sector_catalog
ALTER TABLE public.professionals
ADD CONSTRAINT professionals_sector_id_fkey
FOREIGN KEY (sector_id) REFERENCES public.sector_catalog(id);