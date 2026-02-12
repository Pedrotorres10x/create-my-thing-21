
-- Table for council votes on reports (majority voting: 2 of 3)
CREATE TABLE public.report_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.user_reports(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.professionals(id),
  vote TEXT NOT NULL CHECK (vote IN ('sanction', 'dismiss', 'escalate')),
  severity TEXT CHECK (severity IN ('light', 'serious', 'very_serious')),
  reasoning TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, voter_id)
);

ALTER TABLE public.report_votes ENABLE ROW LEVEL SECURITY;

-- Ethics committee can insert their own votes
CREATE POLICY "Ethics committee can insert report votes"
ON public.report_votes FOR INSERT
TO authenticated
WITH CHECK (
  is_ethics_committee_member((SELECT id FROM professionals WHERE user_id = auth.uid()))
  AND voter_id = (SELECT id FROM professionals WHERE user_id = auth.uid())
);

-- Ethics committee and admins can view votes
CREATE POLICY "Ethics committee can view report votes"
ON public.report_votes FOR SELECT
TO authenticated
USING (
  is_ethics_committee_member((SELECT id FROM professionals WHERE user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can manage
CREATE POLICY "Admins can manage report votes"
ON public.report_votes FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to cast a report vote and check majority
CREATE OR REPLACE FUNCTION public.cast_report_vote(
  _report_id UUID,
  _voter_id UUID,
  _vote TEXT,
  _severity TEXT DEFAULT NULL,
  _reasoning TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result JSONB;
  _total_sanction INT;
  _total_dismiss INT;
  _total_escalate INT;
  _decision TEXT := NULL;
  _majority_severity TEXT := NULL;
  _report RECORD;
  _reported_id UUID;
BEGIN
  -- Verify voter is committee member
  IF NOT is_ethics_committee_member(_voter_id) THEN
    RAISE EXCEPTION 'Not a committee member';
  END IF;

  -- Verify report is pending/under review
  SELECT * INTO _report FROM user_reports 
  WHERE id = _report_id AND status IN ('pending', 'under_ethics_review');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found or already resolved';
  END IF;

  _reported_id := _report.reported_id;

  -- Mark as under review if pending
  IF _report.status = 'pending' THEN
    UPDATE user_reports SET status = 'under_ethics_review' WHERE id = _report_id;
  END IF;

  -- Insert vote (unique constraint prevents double voting)
  INSERT INTO report_votes (report_id, voter_id, vote, severity, reasoning)
  VALUES (_report_id, _voter_id, _vote, _severity, _reasoning);

  -- Count votes
  SELECT
    COUNT(*) FILTER (WHERE vote = 'sanction'),
    COUNT(*) FILTER (WHERE vote = 'dismiss'),
    COUNT(*) FILTER (WHERE vote = 'escalate')
  INTO _total_sanction, _total_dismiss, _total_escalate
  FROM report_votes WHERE report_id = _report_id;

  -- Check for majority (2 of 3)
  IF _total_sanction >= 2 THEN _decision := 'sanction'; END IF;
  IF _total_dismiss >= 2 THEN _decision := 'dismiss'; END IF;
  IF _total_escalate >= 2 THEN _decision := 'escalate'; END IF;

  -- Execute decision if majority reached
  IF _decision IS NOT NULL THEN
    IF _decision = 'sanction' THEN
      -- Get the most severe vote among sanction voters
      SELECT rv.severity INTO _majority_severity
      FROM report_votes rv
      WHERE rv.report_id = _report_id AND rv.vote = 'sanction' AND rv.severity IS NOT NULL
      ORDER BY CASE rv.severity 
        WHEN 'very_serious' THEN 3 
        WHEN 'serious' THEN 2 
        WHEN 'light' THEN 1 
      END DESC
      LIMIT 1;

      -- Default to light if no severity specified
      IF _majority_severity IS NULL THEN
        _majority_severity := 'light';
      END IF;

      -- Apply sanction
      UPDATE user_reports SET 
        status = 'resolved_by_ethics',
        ethics_committee_reviewed_by = _voter_id,
        ethics_committee_reviewed_at = now(),
        ethics_committee_resolution = 'Sanción por mayoría del Consejo (' || _majority_severity || ')'
      WHERE id = _report_id;

      -- Create penalty
      DECLARE
        _points INT;
        _days INT;
        _label TEXT;
      BEGIN
        SELECT 
          CASE _majority_severity WHEN 'light' THEN 20 WHEN 'serious' THEN 50 WHEN 'very_serious' THEN 100 END,
          CASE _majority_severity WHEN 'light' THEN 0 WHEN 'serious' THEN 7 WHEN 'very_serious' THEN 30 END,
          CASE _majority_severity WHEN 'light' THEN 'Leve' WHEN 'serious' THEN 'Grave' WHEN 'very_serious' THEN 'Muy grave' END
        INTO _points, _days, _label;

        INSERT INTO user_penalties (
          professional_id, penalty_type, severity, reason, points_deducted, 
          restriction_until, created_by, is_active
        ) VALUES (
          _reported_id, 'ethics_sanction', _majority_severity,
          'Sanción del Consejo por mayoría (' || _label || ')',
          _points,
          CASE WHEN _days > 0 THEN now() + (_days || ' days')::INTERVAL ELSE NULL END,
          _voter_id, true
        );

        -- Deduct points
        PERFORM deduct_points(_reported_id, _points);

        -- Record transaction
        INSERT INTO point_transactions (professional_id, points, reason)
        VALUES (_reported_id, -_points, 'Sanción del Consejo: ' || _label);
      END;

    ELSIF _decision = 'dismiss' THEN
      UPDATE user_reports SET 
        status = 'dismissed',
        ethics_committee_reviewed_by = _voter_id,
        ethics_committee_reviewed_at = now(),
        ethics_committee_resolution = 'Desestimado por mayoría del Consejo'
      WHERE id = _report_id;

    ELSIF _decision = 'escalate' THEN
      UPDATE user_reports SET 
        status = 'escalated',
        escalated_to_admin = true,
        ethics_committee_reviewed_by = _voter_id,
        ethics_committee_reviewed_at = now(),
        escalation_reason = 'Escalado por mayoría del Consejo'
      WHERE id = _report_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'vote_recorded', true,
    'decision', _decision,
    'severity', _majority_severity,
    'votes', jsonb_build_object('sanction', _total_sanction, 'dismiss', _total_dismiss, 'escalate', _total_escalate)
  );
END;
$$;
