-- Paso 1: Crear tabla de niveles de puntos
CREATE TABLE IF NOT EXISTS public.point_levels (
  id SERIAL PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  badge_color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar los 5 niveles predefinidos
INSERT INTO public.point_levels (level_number, name, min_points, max_points, badge_color) VALUES
  (1, 'Bronce', 0, 99, '#CD7F32'),
  (2, 'Plata', 100, 249, '#C0C0C0'),
  (3, 'Oro', 250, 499, '#FFD700'),
  (4, 'Platino', 500, 999, '#E5E4E2'),
  (5, 'Diamante', 1000, NULL, '#B9F2FF');

-- Habilitar RLS
ALTER TABLE public.point_levels ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos pueden ver los niveles
CREATE POLICY "Anyone can view point levels"
  ON public.point_levels
  FOR SELECT
  USING (true);

-- Paso 2: Agregar columna total_points a professionals
ALTER TABLE public.professionals 
  ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0 NOT NULL;

-- Paso 3: Crear tabla de transacciones de puntos para historial
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas: Los usuarios pueden ver sus propias transacciones
CREATE POLICY "Users can view their own point transactions"
  ON public.point_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE professionals.id = point_transactions.professional_id
        AND professionals.user_id = auth.uid()
    )
  );

-- Admins pueden ver todas las transacciones
CREATE POLICY "Admins can view all point transactions"
  ON public.point_transactions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Paso 4: Función para actualizar puntos del profesional
CREATE OR REPLACE FUNCTION public.update_professional_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_prof_id UUID;
  points_to_add INTEGER;
BEGIN
  -- Solo cuando un referido se completa
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Obtener el ID del profesional referente
    referrer_prof_id := NEW.referrer_id;
    points_to_add := COALESCE(NEW.reward_points, 100);
    
    -- Actualizar puntos totales del profesional
    UPDATE professionals
    SET total_points = total_points + points_to_add
    WHERE id = referrer_prof_id;
    
    -- Registrar la transacción
    INSERT INTO point_transactions (professional_id, points, reason, referral_id)
    VALUES (referrer_prof_id, points_to_add, 'Referido completado', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para actualizar puntos cuando se completa un referido
DROP TRIGGER IF EXISTS update_points_on_referral_completion ON public.referrals;
CREATE TRIGGER update_points_on_referral_completion
  AFTER UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_professional_points();

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_point_transactions_professional_id ON public.point_transactions(professional_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON public.point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_professionals_total_points ON public.professionals(total_points DESC);