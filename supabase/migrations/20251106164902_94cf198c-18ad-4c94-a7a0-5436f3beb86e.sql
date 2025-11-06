-- Crear tabla de capítulos
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'España',
  description TEXT,
  meeting_schedule TEXT,
  location_details TEXT,
  leader_id UUID REFERENCES professionals(id),
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agregar columna chapter_id a professionals
ALTER TABLE public.professionals
ADD COLUMN chapter_id UUID REFERENCES chapters(id);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_chapters_location ON chapters(city, state);
CREATE INDEX idx_professionals_chapter ON professionals(chapter_id);

-- Habilitar RLS
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chapters
CREATE POLICY "Anyone can view chapters"
ON public.chapters
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage chapters"
ON public.chapters
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Función para actualizar contador de miembros
CREATE OR REPLACE FUNCTION public.update_chapter_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.chapter_id IS NOT NULL THEN
      UPDATE chapters
      SET member_count = (
        SELECT COUNT(*)
        FROM professionals
        WHERE chapter_id = NEW.chapter_id
          AND status = 'approved'
      )
      WHERE id = NEW.chapter_id;
    END IF;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.chapter_id IS DISTINCT FROM NEW.chapter_id THEN
    IF OLD.chapter_id IS NOT NULL THEN
      UPDATE chapters
      SET member_count = (
        SELECT COUNT(*)
        FROM professionals
        WHERE chapter_id = OLD.chapter_id
          AND status = 'approved'
      )
      WHERE id = OLD.chapter_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' AND OLD.chapter_id IS NOT NULL THEN
    UPDATE chapters
    SET member_count = (
      SELECT COUNT(*)
      FROM professionals
      WHERE chapter_id = OLD.chapter_id
        AND status = 'approved'
    )
    WHERE id = OLD.chapter_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para actualizar contador de miembros
CREATE TRIGGER update_chapter_members_count
AFTER INSERT OR UPDATE OR DELETE ON professionals
FOR EACH ROW
EXECUTE FUNCTION update_chapter_member_count();

-- Trigger para updated_at en chapters
CREATE TRIGGER update_chapters_updated_at
BEFORE UPDATE ON chapters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();