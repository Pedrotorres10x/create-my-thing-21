-- Auto-assign motivational apellido to chapters on creation
CREATE OR REPLACE FUNCTION public.assign_chapter_apellido()
RETURNS TRIGGER AS $$
DECLARE
  apellidos TEXT[] := ARRAY[
    'Innovación', 'Fortaleza', 'Desarrollo', 'Impulso', 'Conquista',
    'Alianza', 'Legado', 'Visión', 'Evolución', 'Impacto',
    'Horizonte', 'Audacia', 'Conexión', 'Avance', 'Liderazgo',
    'Sinergia', 'Estrategia', 'Victoria', 'Progreso', 'Ambición',
    'Resiliencia', 'Energía', 'Excelencia', 'Potencia', 'Voluntad',
    'Expansión', 'Determinación', 'Valor', 'Empuje', 'Confianza'
  ];
  used_apellidos TEXT[];
  available TEXT[];
  selected TEXT;
  i INT;
BEGIN
  -- Get already used apellidos
  SELECT array_agg(c.apellido) INTO used_apellidos
  FROM chapters c
  WHERE c.apellido IS NOT NULL AND c.id != NEW.id;

  -- Filter available ones
  available := ARRAY[]::TEXT[];
  FOR i IN 1..array_length(apellidos, 1) LOOP
    IF used_apellidos IS NULL OR NOT (apellidos[i] = ANY(used_apellidos)) THEN
      available := array_append(available, apellidos[i]);
    END IF;
  END LOOP;

  -- Pick random from available, or fallback to full list
  IF array_length(available, 1) > 0 THEN
    selected := available[1 + floor(random() * array_length(available, 1))::int];
  ELSE
    selected := apellidos[1 + floor(random() * array_length(apellidos, 1))::int];
  END IF;

  NEW.apellido := selected;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_assign_chapter_apellido
  BEFORE INSERT ON public.chapters
  FOR EACH ROW
  WHEN (NEW.apellido IS NULL)
  EXECUTE FUNCTION public.assign_chapter_apellido();