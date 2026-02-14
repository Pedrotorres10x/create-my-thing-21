
-- Table for specialization conflict requests (when a new user wants to join a tribe where their profession already exists)
CREATE TABLE public.specialization_conflict_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id UUID NOT NULL REFERENCES public.professionals(id),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id),
  existing_professional_id UUID NOT NULL REFERENCES public.professionals(id),
  applicant_specialization TEXT NOT NULL,
  applicant_description TEXT,
  existing_specialization TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, new_chapter
  decision_reason TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  votes_approve INTEGER NOT NULL DEFAULT 0,
  votes_reject INTEGER NOT NULL DEFAULT 0,
  votes_new_chapter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Votes table for conflict decisions
CREATE TABLE public.specialization_conflict_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conflict_request_id UUID NOT NULL REFERENCES public.specialization_conflict_requests(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.professionals(id),
  vote TEXT NOT NULL, -- 'approve' (can enter), 'reject' (cannot), 'new_chapter' (should create new tribe)
  reasoning TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conflict_request_id, voter_id)
);

-- Enable RLS
ALTER TABLE public.specialization_conflict_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialization_conflict_votes ENABLE ROW LEVEL SECURITY;

-- RLS for conflict requests
CREATE POLICY "Applicants can view own requests"
  ON public.specialization_conflict_requests FOR SELECT
  USING (applicant_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Ethics committee can view chapter conflict requests"
  ON public.specialization_conflict_requests FOR SELECT
  USING (
    is_ethics_committee_member((SELECT id FROM professionals WHERE user_id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Service and admins can insert conflict requests"
  ON public.specialization_conflict_requests FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR applicant_id IN (SELECT id FROM professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update conflict requests"
  ON public.specialization_conflict_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Ethics committee can update conflict requests"
  ON public.specialization_conflict_requests FOR UPDATE
  USING (is_ethics_committee_member((SELECT id FROM professionals WHERE user_id = auth.uid())));

-- RLS for conflict votes
CREATE POLICY "Ethics committee can view conflict votes"
  ON public.specialization_conflict_votes FOR SELECT
  USING (
    is_ethics_committee_member((SELECT id FROM professionals WHERE user_id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Ethics committee can cast conflict votes"
  ON public.specialization_conflict_votes FOR INSERT
  WITH CHECK (
    is_ethics_committee_member((SELECT id FROM professionals WHERE user_id = auth.uid()))
    AND voter_id = (SELECT id FROM professionals WHERE user_id = auth.uid())
  );

-- Trigger to tally votes and auto-decide with 2/3 majority
CREATE OR REPLACE FUNCTION public.process_conflict_vote()
RETURNS TRIGGER AS $$
DECLARE
  _request RECORD;
  _total_votes INTEGER;
  _approve INTEGER;
  _reject INTEGER;
  _new_chapter INTEGER;
  _decision TEXT;
BEGIN
  -- Count votes
  SELECT 
    COUNT(*) FILTER (WHERE vote = 'approve'),
    COUNT(*) FILTER (WHERE vote = 'reject'),
    COUNT(*) FILTER (WHERE vote = 'new_chapter'),
    COUNT(*)
  INTO _approve, _reject, _new_chapter, _total_votes
  FROM specialization_conflict_votes
  WHERE conflict_request_id = NEW.conflict_request_id;

  -- Update vote counts
  UPDATE specialization_conflict_requests
  SET votes_approve = _approve, votes_reject = _reject, votes_new_chapter = _new_chapter, updated_at = now()
  WHERE id = NEW.conflict_request_id;

  -- Auto-decide when all 3 committee members voted (2/3 majority)
  IF _total_votes >= 3 THEN
    IF _approve >= 2 THEN
      _decision := 'approved';
    ELSIF _reject >= 2 THEN
      _decision := 'rejected';
    ELSIF _new_chapter >= 2 THEN
      _decision := 'new_chapter';
    ELSE
      -- No clear majority, default to reject (safest)
      _decision := 'rejected';
    END IF;

    UPDATE specialization_conflict_requests
    SET status = _decision, decided_at = now(), updated_at = now()
    WHERE id = NEW.conflict_request_id AND status = 'pending';

    -- If approved, auto-assign the applicant to the chapter
    IF _decision = 'approved' THEN
      SELECT * INTO _request FROM specialization_conflict_requests WHERE id = NEW.conflict_request_id;
      UPDATE professionals SET chapter_id = _request.chapter_id WHERE id = _request.applicant_id;
    END IF;

    -- Create notification for the applicant
    INSERT INTO lovable_messages (professional_id, title, message_type, content, tone, trigger_action)
    SELECT 
      applicant_id,
      CASE _decision
        WHEN 'approved' THEN 'Tu entrada ha sido aprobada'
        WHEN 'rejected' THEN 'Solicitud de entrada denegada'
        WHEN 'new_chapter' THEN 'Te recomendamos fundar tu propia Tribu'
      END,
      'committee_decision',
      CASE _decision
        WHEN 'approved' THEN 'El Comité de Sabios ha aprobado tu entrada en la Tribu. Ya puedes empezar a conectar con tus compañeros.'
        WHEN 'rejected' THEN 'El Comité de Sabios ha decidido que tu línea de negocio coincide demasiado con un miembro existente. Te recomendamos buscar otra Tribu o fundar una nueva.'
        WHEN 'new_chapter' THEN 'El Comité de Sabios sugiere que fundes tu propia Tribu. Tu especialización merece un espacio propio donde seas la referencia.'
      END,
      'professional',
      CASE _decision
        WHEN 'approved' THEN 'go_to_tribe'
        WHEN 'rejected' THEN 'search_tribes'
        WHEN 'new_chapter' THEN 'create_tribe'
      END
    FROM specialization_conflict_requests WHERE id = NEW.conflict_request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_conflict_vote_cast
  AFTER INSERT ON public.specialization_conflict_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.process_conflict_vote();

-- Trigger to update updated_at
CREATE TRIGGER update_conflict_requests_updated_at
  BEFORE UPDATE ON public.specialization_conflict_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
