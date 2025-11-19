-- Crear tabla de esferas de negocio
CREATE TABLE public.business_spheres (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de relación entre esferas y especializaciones
CREATE TABLE public.sphere_specializations (
  id SERIAL PRIMARY KEY,
  business_sphere_id INTEGER REFERENCES public.business_spheres(id) ON DELETE CASCADE,
  specialization_id INTEGER REFERENCES public.specializations(id) ON DELETE CASCADE,
  is_core BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_sphere_id, specialization_id)
);

-- Añadir columna business_sphere_id a professionals
ALTER TABLE public.professionals
ADD COLUMN business_sphere_id INTEGER REFERENCES public.business_spheres(id);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.business_spheres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sphere_specializations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para business_spheres
CREATE POLICY "Anyone can view business spheres"
  ON public.business_spheres FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage business spheres"
  ON public.business_spheres FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para sphere_specializations
CREATE POLICY "Anyone can view sphere specializations"
  ON public.sphere_specializations FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sphere specializations"
  ON public.sphere_specializations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insertar las 8 esferas iniciales
INSERT INTO public.business_spheres (name, description, icon, color) VALUES
('Esfera Inmobiliaria', 'Profesionales del sector inmobiliario, construcción y servicios relacionados', 'Building', 'hsl(210, 100%, 50%)'),
('Esfera Digital', 'Profesionales de tecnología, desarrollo y marketing digital', 'Laptop', 'hsl(270, 100%, 50%)'),
('Esfera Salud y Bienestar', 'Profesionales de la salud, nutrición y bienestar físico y mental', 'Heart', 'hsl(0, 100%, 50%)'),
('Esfera Servicios Empresariales', 'Consultores, asesores legales, contables y financieros', 'Briefcase', 'hsl(200, 80%, 45%)'),
('Esfera Producción e Industria', 'Profesionales de manufactura, producción y automatización industrial', 'Factory', 'hsl(30, 90%, 50%)'),
('Esfera Alimentación y Hostelería', 'Restaurantes, catering y servicios gastronómicos', 'UtensilsCrossed', 'hsl(45, 100%, 50%)'),
('Esfera Retail y Comercio', 'Comercio al por menor, e-commerce y distribución', 'ShoppingBag', 'hsl(330, 100%, 50%)'),
('Esfera Formación y Desarrollo', 'Capacitación, e-learning y desarrollo profesional', 'GraduationCap', 'hsl(120, 60%, 45%)');

-- Crear relaciones automáticas entre esferas y especializaciones
-- Nota: Estas son sugerencias iniciales que se pueden ajustar
INSERT INTO public.sphere_specializations (business_sphere_id, specialization_id, is_core)
SELECT 
  1 as business_sphere_id, -- Esfera Inmobiliaria
  s.id as specialization_id,
  true as is_core
FROM public.specializations s
JOIN public.sector_catalog sc ON s.sector_id = sc.id
WHERE sc.name IN ('Bienes Raíces', 'Arquitectura', 'Construcción Residencial')
   OR s.name ILIKE '%notario%'
   OR s.name ILIKE '%hipoteca%'
   OR s.name ILIKE '%tasador%'
   OR s.name ILIKE '%promotor%';

INSERT INTO public.sphere_specializations (business_sphere_id, specialization_id, is_core)
SELECT 
  2 as business_sphere_id, -- Esfera Digital
  s.id as specialization_id,
  true as is_core
FROM public.specializations s
JOIN public.sector_catalog sc ON s.sector_id = sc.id
WHERE sc.name IN ('Desarrollo de Software', 'Marketing Digital', 'Diseño Gráfico', 'E-commerce')
   OR s.name ILIKE '%digital%'
   OR s.name ILIKE '%software%'
   OR s.name ILIKE '%web%'
   OR s.name ILIKE '%social media%';

INSERT INTO public.sphere_specializations (business_sphere_id, specialization_id, is_core)
SELECT 
  3 as business_sphere_id, -- Esfera Salud y Bienestar
  s.id as specialization_id,
  true as is_core
FROM public.specializations s
JOIN public.sector_catalog sc ON s.sector_id = sc.id
WHERE sc.name IN ('Medicina General', 'Nutrición', 'Fitness', 'Coaching')
   OR s.name ILIKE '%salud%'
   OR s.name ILIKE '%médico%'
   OR s.name ILIKE '%bienestar%'
   OR s.name ILIKE '%deporte%';

INSERT INTO public.sphere_specializations (business_sphere_id, specialization_id, is_core)
SELECT 
  4 as business_sphere_id, -- Esfera Servicios Empresariales
  s.id as specialization_id,
  true as is_core
FROM public.specializations s
JOIN public.sector_catalog sc ON s.sector_id = sc.id
WHERE sc.name IN ('Consultoría Empresarial', 'Contabilidad', 'Servicios Legales', 'Asesoría Financiera')
   OR s.name ILIKE '%consultor%'
   OR s.name ILIKE '%legal%'
   OR s.name ILIKE '%financier%'
   OR s.name ILIKE '%contab%';

INSERT INTO public.sphere_specializations (business_sphere_id, specialization_id, is_core)
SELECT 
  5 as business_sphere_id, -- Esfera Producción e Industria
  s.id as specialization_id,
  true as is_core
FROM public.specializations s
JOIN public.sector_catalog sc ON s.sector_id = sc.id
WHERE sc.name IN ('Producción Industrial', 'Automatización')
   OR s.name ILIKE '%manufactur%'
   OR s.name ILIKE '%producci%'
   OR s.name ILIKE '%industrial%';

INSERT INTO public.sphere_specializations (business_sphere_id, specialization_id, is_core)
SELECT 
  6 as business_sphere_id, -- Esfera Alimentación y Hostelería
  s.id as specialization_id,
  true as is_core
FROM public.specializations s
JOIN public.sector_catalog sc ON s.sector_id = sc.id
WHERE sc.name ILIKE '%restaurante%'
   OR s.name ILIKE '%catering%'
   OR s.name ILIKE '%hostelería%'
   OR s.name ILIKE '%gastronomía%';

INSERT INTO public.sphere_specializations (business_sphere_id, specialization_id, is_core)
SELECT 
  7 as business_sphere_id, -- Esfera Retail y Comercio
  s.id as specialization_id,
  true as is_core
FROM public.specializations s
JOIN public.sector_catalog sc ON s.sector_id = sc.id
WHERE sc.name IN ('Retail', 'E-commerce')
   OR s.name ILIKE '%retail%'
   OR s.name ILIKE '%comercio%'
   OR s.name ILIKE '%tienda%';

INSERT INTO public.sphere_specializations (business_sphere_id, specialization_id, is_core)
SELECT 
  8 as business_sphere_id, -- Esfera Formación y Desarrollo
  s.id as specialization_id,
  true as is_core
FROM public.specializations s
JOIN public.sector_catalog sc ON s.sector_id = sc.id
WHERE sc.name IN ('Capacitación Corporativa', 'E-learning', 'Coaching')
   OR s.name ILIKE '%formación%'
   OR s.name ILIKE '%educación%'
   OR s.name ILIKE '%capacitación%';