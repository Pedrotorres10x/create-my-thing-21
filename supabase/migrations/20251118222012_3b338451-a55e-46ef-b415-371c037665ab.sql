-- Create penalty appeals table
CREATE TABLE IF NOT EXISTS public.penalty_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penalty_id UUID NOT NULL REFERENCES public.user_penalties(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  appeal_reason TEXT NOT NULL,
  additional_context TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  admin_response TEXT,
  reviewed_by UUID REFERENCES public.professionals(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.penalty_appeals ENABLE ROW LEVEL SECURITY;

-- Professionals can view their own appeals
CREATE POLICY "Professionals can view their own appeals"
ON public.penalty_appeals
FOR SELECT
USING (
  professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- Professionals can create appeals for their own penalties
CREATE POLICY "Professionals can create their own appeals"
ON public.penalty_appeals
FOR INSERT
WITH CHECK (
  professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
  AND penalty_id IN (
    SELECT id FROM public.user_penalties WHERE professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  )
);

-- Admins can view all appeals
CREATE POLICY "Admins can view all appeals"
ON public.penalty_appeals
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update appeals
CREATE POLICY "Admins can update appeals"
ON public.penalty_appeals
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_penalty_appeals_updated_at
BEFORE UPDATE ON public.penalty_appeals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_penalty_appeals_status ON public.penalty_appeals(status);
CREATE INDEX idx_penalty_appeals_professional_id ON public.penalty_appeals(professional_id);