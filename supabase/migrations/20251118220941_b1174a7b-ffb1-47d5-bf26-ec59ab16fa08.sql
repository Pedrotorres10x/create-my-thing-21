-- Agregar campos de verificación a la tabla professionals
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nif_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS business_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_documents_url TEXT[];

-- Tabla para tracking de cambios en verificaciones
CREATE TABLE IF NOT EXISTS public.verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('email', 'nif', 'business')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  verified_by UUID REFERENCES public.professionals(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_verification_logs_professional_id ON public.verification_logs(professional_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_status ON public.verification_logs(status);

-- RLS para verification_logs
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propios logs
CREATE POLICY "Users can view their own verification logs"
  ON public.verification_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.professionals
      WHERE id = verification_logs.professional_id AND user_id = auth.uid()
    )
  );

-- Los admins pueden ver y gestionar todos los logs
CREATE POLICY "Admins can manage all verification logs"
  ON public.verification_logs
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Actualizar campo reviewed_by en user_reports para que acepte cualquier UUID
ALTER TABLE public.user_reports 
DROP CONSTRAINT IF EXISTS user_reports_reviewed_by_fkey,
ADD CONSTRAINT user_reports_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

COMMENT ON COLUMN public.professionals.email_verified IS 'Usuario ha verificado su email';
COMMENT ON COLUMN public.professionals.nif_verified IS 'NIF/CIF ha sido verificado';
COMMENT ON COLUMN public.professionals.business_verified IS 'Empresa ha sido verificada manualmente';
COMMENT ON TABLE public.verification_logs IS 'Registro de todas las verificaciones de identidad';