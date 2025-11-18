-- Añadir campos para el comité de ética en user_reports
ALTER TABLE user_reports 
ADD COLUMN IF NOT EXISTS ethics_committee_reviewed_by uuid REFERENCES professionals(id),
ADD COLUMN IF NOT EXISTS ethics_committee_reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ethics_committee_resolution text,
ADD COLUMN IF NOT EXISTS escalated_to_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS escalation_reason text;

-- Actualizar los posibles estados de los reportes
COMMENT ON COLUMN user_reports.status IS 'pending, under_ethics_review, resolved_by_ethics, escalated, reviewed, dismissed';

-- Crear función para obtener los miembros del comité de ética (top 3 por ranking)
CREATE OR REPLACE FUNCTION get_ethics_committee_members()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  total_points integer,
  photo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    full_name,
    email,
    total_points,
    photo_url
  FROM professionals
  WHERE status = 'approved'
    AND moderation_blocked = false
  ORDER BY total_points DESC
  LIMIT 3;
$$;

-- Función para verificar si un usuario es miembro del comité de ética
CREATE OR REPLACE FUNCTION is_ethics_committee_member(_professional_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM get_ethics_committee_members()
    WHERE id = _professional_id
  );
$$;

-- Actualizar políticas RLS para user_reports para incluir comité de ética
DROP POLICY IF EXISTS "Ethics committee can view reports" ON user_reports;
CREATE POLICY "Ethics committee can view reports"
ON user_reports
FOR SELECT
TO authenticated
USING (
  is_ethics_committee_member((
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Ethics committee can update reports" ON user_reports;
CREATE POLICY "Ethics committee can update reports"
ON user_reports
FOR UPDATE
TO authenticated
USING (
  is_ethics_committee_member((
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
);

-- Crear tabla para tracking de decisiones del comité de ética
CREATE TABLE IF NOT EXISTS ethics_committee_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES user_reports(id) ON DELETE CASCADE,
  reviewed_by uuid NOT NULL REFERENCES professionals(id),
  decision text NOT NULL CHECK (decision IN ('resolved', 'escalate', 'dismiss')),
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(report_id, reviewed_by)
);

ALTER TABLE ethics_committee_decisions ENABLE ROW LEVEL SECURITY;

-- RLS para ethics_committee_decisions
CREATE POLICY "Ethics committee can view their decisions"
ON ethics_committee_decisions
FOR SELECT
TO authenticated
USING (
  is_ethics_committee_member((
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Ethics committee can insert decisions"
ON ethics_committee_decisions
FOR INSERT
TO authenticated
WITH CHECK (
  is_ethics_committee_member((
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ))
  AND reviewed_by IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
);

-- Admins pueden ver todas las decisiones
CREATE POLICY "Admins can view all ethics decisions"
ON ethics_committee_decisions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

COMMENT ON TABLE ethics_committee_decisions IS 'Registro de decisiones tomadas por el comité de ética sobre reportes de usuarios';
COMMENT ON TABLE user_reports IS 'Reportes de usuarios que pasan por el comité de ética antes de llegar al administrador';