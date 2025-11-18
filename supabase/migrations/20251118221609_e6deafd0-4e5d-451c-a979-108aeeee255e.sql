-- Función para deducir puntos de un profesional
CREATE OR REPLACE FUNCTION public.deduct_points(prof_id UUID, points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.professionals
  SET total_points = GREATEST(total_points - points, 0)
  WHERE id = prof_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Agregar nuevo tipo de violación para evasión de pago
COMMENT ON COLUMN public.moderation_violations.violation_type IS 'Tipos: text, image, payment_evasion_attempt';

-- Índice para búsquedas rápidas de violaciones por tipo
CREATE INDEX IF NOT EXISTS idx_moderation_violations_type ON public.moderation_violations(violation_type);

-- Agregar campo para tracking de análisis automáticos
ALTER TABLE public.moderation_violations 
ADD COLUMN IF NOT EXISTS auto_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS detection_confidence NUMERIC(5,2);

COMMENT ON COLUMN public.moderation_violations.auto_detected IS 'true si fue detectado automáticamente por IA';
COMMENT ON COLUMN public.moderation_violations.detection_confidence IS 'Confianza del análisis automático (0-100)';