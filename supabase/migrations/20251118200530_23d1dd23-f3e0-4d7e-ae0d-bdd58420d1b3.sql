-- Create table to track content moderation violations
CREATE TABLE IF NOT EXISTS public.moderation_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL CHECK (violation_type IN ('text', 'image', 'video')),
  content_context TEXT, -- Campo donde ocurrió (nombre, logo, etc)
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  reason TEXT NOT NULL,
  categories TEXT[], -- Categorías de violación detectadas
  blocked BOOLEAN DEFAULT FALSE, -- Si el usuario fue bloqueado por esto
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for querying violations by user
CREATE INDEX idx_moderation_violations_user_id ON public.moderation_violations(user_id);
CREATE INDEX idx_moderation_violations_professional_id ON public.moderation_violations(professional_id);
CREATE INDEX idx_moderation_violations_created_at ON public.moderation_violations(created_at DESC);

-- Enable RLS
ALTER TABLE public.moderation_violations ENABLE ROW LEVEL SECURITY;

-- Only admins can view violations
CREATE POLICY "Admins can view all violations"
  ON public.moderation_violations
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Add column to professionals to track if they're blocked due to violations
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS moderation_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderation_block_reason TEXT;

-- Function to check if user should be auto-blocked (3+ high severity violations)
CREATE OR REPLACE FUNCTION public.check_auto_block_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  violation_count INTEGER;
BEGIN
  -- Count high severity violations for this user in last 30 days
  SELECT COUNT(*)
  INTO violation_count
  FROM moderation_violations
  WHERE user_id = NEW.user_id
    AND severity = 'high'
    AND created_at > NOW() - INTERVAL '30 days';

  -- If 3 or more high severity violations, block the user
  IF violation_count >= 3 THEN
    UPDATE professionals
    SET 
      moderation_blocked = TRUE,
      moderation_block_reason = 'Múltiples intentos de contenido inapropiado detectados',
      status = 'rejected'
    WHERE user_id = NEW.user_id;
    
    NEW.blocked = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-block after violations
CREATE TRIGGER trigger_check_auto_block
  BEFORE INSERT ON public.moderation_violations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_auto_block_user();

-- Add comment
COMMENT ON TABLE public.moderation_violations IS 'Registra violaciones de contenido detectadas por el sistema de moderación';
COMMENT ON COLUMN public.professionals.moderation_blocked IS 'Usuario bloqueado por violaciones de moderación';
COMMENT ON COLUMN public.professionals.moderation_block_reason IS 'Razón del bloqueo por moderación';