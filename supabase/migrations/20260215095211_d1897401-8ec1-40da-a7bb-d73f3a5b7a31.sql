
-- Replace the process_conflict_vote function with new dual-approval logic
CREATE OR REPLACE FUNCTION public.process_conflict_vote()
RETURNS TRIGGER AS $$
DECLARE
  _request RECORD;
  _total_votes INTEGER;
  _approve INTEGER;
  _reject INTEGER;
  _new_chapter INTEGER;
  _decision TEXT;
  _existing_approval TEXT;
BEGIN
  -- Count committee votes
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

  -- Get existing member approval status
  SELECT existing_member_approval INTO _existing_approval
  FROM specialization_conflict_requests
  WHERE id = NEW.conflict_request_id;

  -- Auto-decide when all 3 committee members voted (2/3 majority)
  IF _total_votes >= 3 THEN
    IF _approve >= 2 THEN
      _decision := 'committee_approved';
    ELSIF _reject >= 2 THEN
      _decision := 'committee_rejected';
    ELSIF _new_chapter >= 2 THEN
      _decision := 'new_chapter';
    ELSE
      _decision := 'committee_rejected';
    END IF;

    -- DUAL APPROVAL LOGIC:
    -- Both positive → auto-admit
    -- Any negative → escalate to admin
    IF _decision = 'committee_approved' AND _existing_approval = 'approved' THEN
      -- Both approved! Auto-assign
      UPDATE specialization_conflict_requests
      SET status = 'approved', decided_at = now(), decision_reason = 'Aprobado por miembro existente y Comité de Sabios', updated_at = now()
      WHERE id = NEW.conflict_request_id AND status = 'pending';

      SELECT * INTO _request FROM specialization_conflict_requests WHERE id = NEW.conflict_request_id;
      UPDATE professionals SET chapter_id = _request.chapter_id WHERE id = _request.applicant_id;

      INSERT INTO lovable_messages (professional_id, title, message_type, content, tone, trigger_action)
      VALUES (_request.applicant_id, '¡Bienvenido a la Tribu!', 'committee_decision', 
        'Tanto el miembro existente como el Comité de Sabios han aprobado tu entrada. ¡Ya eres parte de la Tribu!', 
        'celebratory', 'go_to_tribe');

    ELSIF _decision = 'new_chapter' THEN
      -- New chapter suggestion
      UPDATE specialization_conflict_requests
      SET status = 'new_chapter', decided_at = now(), decision_reason = 'El Comité recomienda fundar nueva Tribu', updated_at = now()
      WHERE id = NEW.conflict_request_id AND status = 'pending';

      SELECT applicant_id INTO _request FROM specialization_conflict_requests WHERE id = NEW.conflict_request_id;
      INSERT INTO lovable_messages (professional_id, title, message_type, content, tone, trigger_action)
      VALUES (_request.applicant_id, 'Te recomendamos fundar tu propia Tribu', 'committee_decision',
        'El Comité de Sabios sugiere que fundes tu propia Tribu. Tu especialización merece un espacio propio.',
        'professional', 'create_tribe');

    ELSIF _decision IN ('committee_rejected') OR _existing_approval = 'rejected' THEN
      -- Any rejection → escalate to admin
      UPDATE specialization_conflict_requests
      SET status = 'escalated_to_admin', decided_at = now(), 
          decision_reason = CASE 
            WHEN _existing_approval = 'rejected' THEN 'Rechazado por miembro existente. Escalado a administración.'
            ELSE 'Rechazado por Comité de Sabios. Escalado a administración.'
          END,
          updated_at = now()
      WHERE id = NEW.conflict_request_id AND status = 'pending';

      SELECT applicant_id INTO _request FROM specialization_conflict_requests WHERE id = NEW.conflict_request_id;
      INSERT INTO lovable_messages (professional_id, title, message_type, content, tone, trigger_action)
      VALUES (_request.applicant_id, 'Tu solicitud está siendo revisada', 'committee_decision',
        'Tu caso ha sido escalado al equipo de administración para una revisión final. Te notificaremos pronto.',
        'professional', 'wait');

    ELSIF _decision = 'committee_approved' AND _existing_approval = 'pending' THEN
      -- Committee approved but still waiting for existing member
      UPDATE specialization_conflict_requests
      SET decision_reason = 'Comité aprobó. Pendiente de aprobación del miembro existente.', updated_at = now()
      WHERE id = NEW.conflict_request_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to handle existing member approval and check if committee already voted
CREATE OR REPLACE FUNCTION public.process_existing_member_approval()
RETURNS TRIGGER AS $$
DECLARE
  _request RECORD;
  _committee_approved BOOLEAN;
BEGIN
  -- Only fire when existing_member_approval changes from 'pending'
  IF OLD.existing_member_approval = 'pending' AND NEW.existing_member_approval != 'pending' AND NEW.status = 'pending' THEN
    
    -- Check if committee has already voted with majority approve
    _committee_approved := (NEW.votes_approve >= 2);

    IF NEW.existing_member_approval = 'approved' AND _committee_approved THEN
      -- Both approved → auto-assign
      NEW.status := 'approved';
      NEW.decided_at := now();
      NEW.decision_reason := 'Aprobado por miembro existente y Comité de Sabios';

      UPDATE professionals SET chapter_id = NEW.chapter_id WHERE id = NEW.applicant_id;

      INSERT INTO lovable_messages (professional_id, title, message_type, content, tone, trigger_action)
      VALUES (NEW.applicant_id, '¡Bienvenido a la Tribu!', 'committee_decision',
        'Tanto el miembro existente como el Comité de Sabios han aprobado tu entrada. ¡Ya eres parte de la Tribu!',
        'celebratory', 'go_to_tribe');

    ELSIF NEW.existing_member_approval = 'rejected' THEN
      -- Existing member rejected → escalate to admin
      NEW.status := 'escalated_to_admin';
      NEW.decided_at := now();
      NEW.decision_reason := 'Rechazado por miembro existente. Escalado a administración.';

      INSERT INTO lovable_messages (professional_id, title, message_type, content, tone, trigger_action)
      VALUES (NEW.applicant_id, 'Tu solicitud está siendo revisada', 'committee_decision',
        'El miembro existente no ha dado su visto bueno. Tu caso ha sido escalado al equipo de administración.',
        'professional', 'wait');

    ELSIF NEW.existing_member_approval = 'approved' AND NOT _committee_approved THEN
      -- Existing member approved, waiting for committee
      NEW.decision_reason := 'Miembro existente aprobó. Pendiente del Comité de Sabios.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for existing member approval
CREATE TRIGGER on_existing_member_approval
  BEFORE UPDATE ON public.specialization_conflict_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.process_existing_member_approval();

-- Allow existing member to view and update their approval on conflict requests
CREATE POLICY "Existing member can view conflict requests about them"
  ON public.specialization_conflict_requests FOR SELECT
  USING (existing_professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Existing member can update their approval"
  ON public.specialization_conflict_requests FOR UPDATE
  USING (existing_professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

-- Add 'escalated_to_admin' to allowed status values (update check constraint if exists)
-- The status column doesn't have a CHECK constraint, so no need to alter it
