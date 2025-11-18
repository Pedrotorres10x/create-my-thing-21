-- Tabla para reportes entre usuarios
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('spam', 'inappropriate_contact', 'fraud', 'harassment', 'fake_profile', 'other')),
  context TEXT, -- Dónde ocurrió: 'marketplace_offer', 'profile', 'post', 'meeting', etc.
  context_id UUID, -- ID de la oferta, post, etc.
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by UUID REFERENCES public.professionals(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reporter_id, reported_id, context, context_id, created_at)
);

-- Índices para mejorar performance
CREATE INDEX idx_user_reports_reported_id ON public.user_reports(reported_id);
CREATE INDEX idx_user_reports_status ON public.user_reports(status);
CREATE INDEX idx_user_reports_created_at ON public.user_reports(created_at DESC);

-- Tabla para penalizaciones de usuarios
CREATE TABLE IF NOT EXISTS public.user_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  penalty_type TEXT NOT NULL CHECK (penalty_type IN ('warning', 'points_deduction', 'temporary_restriction', 'permanent_ban')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  reason TEXT NOT NULL,
  points_deducted INTEGER DEFAULT 0,
  restriction_until TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.professionals(id), -- NULL si es automático
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Índices
CREATE INDEX idx_user_penalties_professional_id ON public.user_penalties(professional_id);
CREATE INDEX idx_user_penalties_active ON public.user_penalties(is_active) WHERE is_active = true;

-- Función para auto-penalizar usuarios con múltiples reportes
CREATE OR REPLACE FUNCTION public.check_auto_penalty()
RETURNS TRIGGER AS $$
DECLARE
  recent_reports_count INTEGER;
  total_reports_count INTEGER;
  existing_penalties_count INTEGER;
BEGIN
  -- Contar reportes recientes (últimos 30 días)
  SELECT COUNT(*)
  INTO recent_reports_count
  FROM public.user_reports
  WHERE reported_id = NEW.reported_id
    AND created_at > NOW() - INTERVAL '30 days'
    AND status != 'dismissed';

  -- Contar reportes totales
  SELECT COUNT(*)
  INTO total_reports_count
  FROM public.user_reports
  WHERE reported_id = NEW.reported_id
    AND status != 'dismissed';

  -- Contar penalizaciones activas
  SELECT COUNT(*)
  INTO existing_penalties_count
  FROM public.user_penalties
  WHERE professional_id = NEW.reported_id
    AND is_active = true
    AND severity IN ('high', 'critical');

  -- Penalización automática según número de reportes
  IF recent_reports_count >= 3 AND recent_reports_count < 5 AND existing_penalties_count = 0 THEN
    -- Primera advertencia: deducir 50 puntos
    INSERT INTO public.user_penalties (
      professional_id,
      penalty_type,
      severity,
      reason,
      points_deducted
    ) VALUES (
      NEW.reported_id,
      'points_deduction',
      'low',
      'Múltiples reportes recibidos - Primera advertencia',
      50
    );

    -- Actualizar puntos
    UPDATE public.professionals
    SET total_points = GREATEST(total_points - 50, 0)
    WHERE id = NEW.reported_id;

  ELSIF recent_reports_count >= 5 AND recent_reports_count < 8 THEN
    -- Segunda advertencia: deducir 100 puntos y restricción temporal
    INSERT INTO public.user_penalties (
      professional_id,
      penalty_type,
      severity,
      reason,
      points_deducted,
      restriction_until
    ) VALUES (
      NEW.reported_id,
      'temporary_restriction',
      'medium',
      'Múltiples reportes recibidos - Restricción temporal',
      100,
      NOW() + INTERVAL '7 days'
    );

    -- Actualizar puntos
    UPDATE public.professionals
    SET total_points = GREATEST(total_points - 100, 0)
    WHERE id = NEW.reported_id;

  ELSIF recent_reports_count >= 8 OR total_reports_count >= 15 THEN
    -- Penalización severa: bloqueo permanente
    INSERT INTO public.user_penalties (
      professional_id,
      penalty_type,
      severity,
      reason,
      points_deducted
    ) VALUES (
      NEW.reported_id,
      'permanent_ban',
      'critical',
      'Comportamiento abusivo reiterado - Cuenta bloqueada',
      500
    );

    -- Bloquear usuario
    UPDATE public.professionals
    SET 
      moderation_blocked = true,
      moderation_block_reason = 'Múltiples reportes de usuarios por comportamiento inapropiado',
      status = 'rejected',
      total_points = 0
    WHERE id = NEW.reported_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para auto-penalizar
CREATE TRIGGER trigger_check_auto_penalty
  AFTER INSERT ON public.user_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_auto_penalty();

-- RLS para user_reports
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden reportar a otros
CREATE POLICY "Users can create reports"
  ON public.user_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE id = reporter_id AND user_id = auth.uid()
    )
  );

-- Los usuarios pueden ver reportes que han hecho
CREATE POLICY "Users can view their own reports"
  ON public.user_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE id = reporter_id AND user_id = auth.uid()
    )
  );

-- Los admins pueden ver y gestionar todos los reportes
CREATE POLICY "Admins can manage all reports"
  ON public.user_reports
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS para user_penalties
ALTER TABLE public.user_penalties ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propias penalizaciones
CREATE POLICY "Users can view their own penalties"
  ON public.user_penalties
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE id = professional_id AND user_id = auth.uid()
    )
  );

-- Los admins pueden gestionar todas las penalizaciones
CREATE POLICY "Admins can manage all penalties"
  ON public.user_penalties
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));