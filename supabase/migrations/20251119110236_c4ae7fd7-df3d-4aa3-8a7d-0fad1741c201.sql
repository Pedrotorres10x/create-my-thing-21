-- Crear tabla de especializaciones específicas
CREATE TABLE IF NOT EXISTS public.profession_specializations (
  id SERIAL PRIMARY KEY,
  specialization_id INTEGER NOT NULL REFERENCES public.specializations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(specialization_id, name)
);

-- Añadir columna a professionals para la especialización específica
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS profession_specialization_id INTEGER REFERENCES public.profession_specializations(id);

-- Crear constraint de unicidad: solo un profesional con cada especialización específica por capítulo
CREATE UNIQUE INDEX IF NOT EXISTS unique_specialization_per_chapter 
ON public.professionals(chapter_id, profession_specialization_id) 
WHERE profession_specialization_id IS NOT NULL AND status = 'approved';

-- Función para verificar disponibilidad de especialización en un capítulo
CREATE OR REPLACE FUNCTION public.check_specialization_availability(
  _chapter_id UUID,
  _profession_specialization_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM professionals
    WHERE chapter_id = _chapter_id
      AND profession_specialization_id = _profession_specialization_id
      AND status = 'approved'
  );
END;
$$;

-- Función para obtener capítulos con disponibilidad de una especialización
CREATE OR REPLACE FUNCTION public.get_available_chapters_for_specialization(
  _profession_specialization_id INTEGER,
  _state TEXT DEFAULT NULL
)
RETURNS TABLE(
  chapter_id UUID,
  chapter_name TEXT,
  city TEXT,
  state TEXT,
  member_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.city,
    c.state,
    c.member_count
  FROM chapters c
  WHERE NOT EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.chapter_id = c.id
      AND p.profession_specialization_id = _profession_specialization_id
      AND p.status = 'approved'
  )
  AND (_state IS NULL OR c.state = _state)
  ORDER BY c.member_count DESC;
END;
$$;

-- Insertar especializaciones específicas iniciales

-- Medicina General (specialization_id: 7)
INSERT INTO public.profession_specializations (specialization_id, name, description) VALUES
(7, 'Pediatra', 'Especialista en medicina infantil'),
(7, 'Dentista / Odontólogo', 'Especialista en salud dental'),
(7, 'Otorrinolaringólogo', 'Especialista en oído, nariz y garganta'),
(7, 'Cardiólogo', 'Especialista en enfermedades del corazón'),
(7, 'Traumatólogo', 'Especialista en sistema músculo-esquelético'),
(7, 'Dermatólogo', 'Especialista en enfermedades de la piel'),
(7, 'Ginecólogo', 'Especialista en salud femenina'),
(7, 'Psiquiatra', 'Especialista en salud mental'),
(7, 'Médico General', 'Medicina general y familiar')
ON CONFLICT (specialization_id, name) DO NOTHING;

-- Bienes Raíces (specialization_id: 12)
INSERT INTO public.profession_specializations (specialization_id, name, description) VALUES
(12, 'Inmobiliaria Residencial', 'Especialista en viviendas residenciales'),
(12, 'Inmobiliaria Comercial', 'Especialista en locales comerciales'),
(12, 'Inmobiliaria Industrial', 'Especialista en naves industriales'),
(12, 'Especialista en Obra Nueva', 'Promotoras y obra nueva'),
(12, 'Especialista en Alquiler', 'Gestión de alquileres'),
(12, 'Tasador Inmobiliario', 'Valoración de propiedades'),
(12, 'Administrador de Fincas', 'Gestión de comunidades')
ON CONFLICT (specialization_id, name) DO NOTHING;

-- Desarrollo de Software (specialization_id: 1)
INSERT INTO public.profession_specializations (specialization_id, name, description) VALUES
(1, 'Desarrollador Frontend', 'Especialista en interfaces de usuario'),
(1, 'Desarrollador Backend', 'Especialista en servidores y APIs'),
(1, 'Desarrollador Full Stack', 'Desarrollo completo frontend y backend'),
(1, 'Desarrollador Mobile', 'Aplicaciones móviles iOS y Android'),
(1, 'DevOps', 'Infraestructura y automatización'),
(1, 'Data Engineer', 'Ingeniería de datos y pipelines')
ON CONFLICT (specialization_id, name) DO NOTHING;

-- Consultoría Empresarial (specialization_id: 4)
INSERT INTO public.profession_specializations (specialization_id, name, description) VALUES
(4, 'Consultoría Estratégica', 'Estrategia empresarial'),
(4, 'Consultoría de RRHH', 'Recursos humanos y talento'),
(4, 'Consultoría Financiera', 'Finanzas y contabilidad'),
(4, 'Consultoría de Procesos', 'Optimización de procesos'),
(4, 'Transformación Digital', 'Digitalización empresarial')
ON CONFLICT (specialization_id, name) DO NOTHING;

-- Marketing Digital (specialization_id: 16)
INSERT INTO public.profession_specializations (specialization_id, name, description) VALUES
(16, 'SEO/SEM', 'Posicionamiento en buscadores'),
(16, 'Social Media Marketing', 'Gestión de redes sociales'),
(16, 'Email Marketing', 'Campañas de email'),
(16, 'Content Marketing', 'Creación de contenidos'),
(16, 'Performance Marketing', 'Marketing basado en resultados')
ON CONFLICT (specialization_id, name) DO NOTHING;

-- Habilitar RLS en la nueva tabla
ALTER TABLE public.profession_specializations ENABLE ROW LEVEL SECURITY;

-- Policy: Cualquiera puede ver las especializaciones
CREATE POLICY "Anyone can view profession specializations"
ON public.profession_specializations FOR SELECT
USING (true);

-- Policy: Solo admins pueden gestionar especializaciones
CREATE POLICY "Admins can manage profession specializations"
ON public.profession_specializations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));