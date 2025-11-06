-- Crear tabla de reuniones 1-a-1
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  meeting_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  meeting_type TEXT DEFAULT 'in_person' CHECK (meeting_type IN ('in_person', 'virtual')),
  meeting_link TEXT,
  notes TEXT,
  requester_notes TEXT,
  recipient_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT different_participants CHECK (requester_id != recipient_id)
);

-- Índices para mejor rendimiento
CREATE INDEX idx_meetings_requester ON meetings(requester_id);
CREATE INDEX idx_meetings_recipient ON meetings(recipient_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_date ON meetings(meeting_date);

-- Habilitar RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para meetings
CREATE POLICY "Users can view their own meetings"
ON public.meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM professionals
    WHERE professionals.user_id = auth.uid()
      AND (professionals.id = meetings.requester_id OR professionals.id = meetings.recipient_id)
  )
);

CREATE POLICY "Users can create meeting requests"
ON public.meetings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM professionals
    WHERE professionals.user_id = auth.uid()
      AND professionals.id = meetings.requester_id
  )
);

CREATE POLICY "Participants can update meetings"
ON public.meetings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM professionals
    WHERE professionals.user_id = auth.uid()
      AND (professionals.id = meetings.requester_id OR professionals.id = meetings.recipient_id)
  )
);

CREATE POLICY "Requester can delete pending meetings"
ON public.meetings
FOR DELETE
USING (
  status = 'pending' AND
  EXISTS (
    SELECT 1 FROM professionals
    WHERE professionals.user_id = auth.uid()
      AND professionals.id = meetings.requester_id
  )
);

CREATE POLICY "Admins can view all meetings"
ON public.meetings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON meetings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Función para contar reuniones completadas
CREATE OR REPLACE FUNCTION public.get_completed_meetings_count(professional_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM meetings
  WHERE (requester_id = professional_uuid OR recipient_id = professional_uuid)
    AND status = 'completed';
$$;