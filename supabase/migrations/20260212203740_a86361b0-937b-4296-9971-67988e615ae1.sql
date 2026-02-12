
-- Create expulsion_reviews table
CREATE TABLE public.expulsion_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  trigger_type text NOT NULL DEFAULT 'inactivity',
  trigger_details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  votes_for_expulsion integer NOT NULL DEFAULT 0,
  votes_against integer NOT NULL DEFAULT 0,
  votes_extend integer NOT NULL DEFAULT 0,
  decided_at timestamptz,
  auto_expire_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create expulsion_votes table
CREATE TABLE public.expulsion_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES public.expulsion_reviews(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  vote text NOT NULL,
  reasoning text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, voter_id)
);

-- Add committee_review_id to reentry_requests
ALTER TABLE public.reentry_requests
  ADD COLUMN IF NOT EXISTS committee_review_id uuid REFERENCES public.expulsion_reviews(id);

-- Enable RLS
ALTER TABLE public.expulsion_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expulsion_votes ENABLE ROW LEVEL SECURITY;

-- RLS for expulsion_reviews
CREATE POLICY "Ethics committee can view expulsion reviews"
  ON public.expulsion_reviews FOR SELECT
  USING (
    is_ethics_committee_member((SELECT id FROM professionals WHERE user_id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Service can insert expulsion reviews"
  ON public.expulsion_reviews FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "Service can update expulsion reviews"
  ON public.expulsion_reviews FOR UPDATE
  USING (auth.uid() IS NULL);

CREATE POLICY "Admins can manage expulsion reviews"
  ON public.expulsion_reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for expulsion_votes
CREATE POLICY "Ethics committee can view votes"
  ON public.expulsion_votes FOR SELECT
  USING (
    is_ethics_committee_member((SELECT id FROM professionals WHERE user_id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Ethics committee can insert votes"
  ON public.expulsion_votes FOR INSERT
  WITH CHECK (
    is_ethics_committee_member((SELECT id FROM professionals WHERE user_id = auth.uid()))
    AND voter_id = (SELECT id FROM professionals WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage votes"
  ON public.expulsion_votes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to cast vote and auto-tally
CREATE OR REPLACE FUNCTION public.cast_expulsion_vote(
  _review_id uuid,
  _voter_id uuid,
  _vote text,
  _reasoning text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
  _review expulsion_reviews%ROWTYPE;
  _total_expel int;
  _total_absolve int;
  _total_extend int;
  _decision text;
BEGIN
  -- Verify voter is committee member
  IF NOT is_ethics_committee_member(_voter_id) THEN
    RAISE EXCEPTION 'Not a committee member';
  END IF;

  -- Verify review is pending
  SELECT * INTO _review FROM expulsion_reviews WHERE id = _review_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found or already decided';
  END IF;

  -- Insert vote (unique constraint prevents double voting)
  INSERT INTO expulsion_votes (review_id, voter_id, vote, reasoning)
  VALUES (_review_id, _voter_id, _vote, _reasoning);

  -- Update vote counters
  SELECT
    COUNT(*) FILTER (WHERE vote = 'expel'),
    COUNT(*) FILTER (WHERE vote = 'absolve'),
    COUNT(*) FILTER (WHERE vote = 'extend')
  INTO _total_expel, _total_absolve, _total_extend
  FROM expulsion_votes WHERE review_id = _review_id;

  UPDATE expulsion_reviews SET
    votes_for_expulsion = _total_expel,
    votes_against = _total_absolve,
    votes_extend = _total_extend
  WHERE id = _review_id;

  -- Check for majority (2 of 3)
  _decision := NULL;
  IF _total_expel >= 2 THEN _decision := 'approved'; END IF;
  IF _total_absolve >= 2 THEN _decision := 'rejected'; END IF;
  IF _total_extend >= 2 THEN _decision := 'extended'; END IF;

  IF _decision IS NOT NULL THEN
    UPDATE expulsion_reviews SET status = _decision, decided_at = now() WHERE id = _review_id;

    -- Execute the decision on the professional
    IF _decision = 'approved' THEN
      -- Expel
      UPDATE professionals SET
        status = CASE WHEN expulsion_count >= 1 THEN 'banned'::professional_status ELSE 'inactive'::professional_status END,
        expulsion_count = expulsion_count + 1,
        last_expulsion_at = now()
      WHERE id = _review.professional_id;
    ELSIF _decision = 'extended' THEN
      -- Grant 1 month extension, reset warning level so they get re-warned from level 3
      DELETE FROM inactivity_warnings
      WHERE professional_id = _review.professional_id AND warning_level = 3;
    END IF;
    -- 'rejected' = absolved, no action needed
  END IF;

  RETURN jsonb_build_object(
    'vote_recorded', true,
    'decision', _decision,
    'votes', jsonb_build_object('expel', _total_expel, 'absolve', _total_absolve, 'extend', _total_extend)
  );
END;
$$;
