-- Add surname/apellido field to chapters
ALTER TABLE public.chapters ADD COLUMN apellido text NULL;

-- Update existing chapter
UPDATE public.chapters SET apellido = 'Innovación' WHERE name = 'Tribu Benidorm';