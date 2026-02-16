
-- Rate limiting table to track user actions per time window
CREATE TABLE public.rate_limit_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'chat_message', 'meeting_request', 'deal_creation', 'offer_contact'
  content_hash text, -- hash of content for duplicate detection
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient rate limit queries
CREATE INDEX idx_rate_limit_actions_lookup 
ON public.rate_limit_actions (professional_id, action_type, created_at DESC);

-- Index for duplicate content detection
CREATE INDEX idx_rate_limit_content_hash 
ON public.rate_limit_actions (professional_id, content_hash, created_at DESC)
WHERE content_hash IS NOT NULL;

-- Auto-cleanup: delete records older than 24 hours (via scheduled function)
-- For now, we'll clean on insert

-- Enable RLS
ALTER TABLE public.rate_limit_actions ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own rate limit records
CREATE POLICY "Users can insert own rate limit records"
ON public.rate_limit_actions FOR INSERT
WITH CHECK (
  professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- Users can read their own records (for client-side checks)
CREATE POLICY "Users can read own rate limit records"
ON public.rate_limit_actions FOR SELECT
USING (
  professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _professional_id uuid,
  _action_type text,
  _max_actions integer,
  _window_minutes integer,
  _content_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  action_count integer;
  duplicate_count integer;
  is_allowed boolean := true;
  reason text := NULL;
BEGIN
  -- Count actions in the time window
  SELECT COUNT(*) INTO action_count
  FROM rate_limit_actions
  WHERE professional_id = _professional_id
    AND action_type = _action_type
    AND created_at > now() - (_window_minutes || ' minutes')::interval;

  -- Check rate limit
  IF action_count >= _max_actions THEN
    is_allowed := false;
    reason := 'Has alcanzado el límite de acciones. Espera unos minutos antes de intentarlo de nuevo.';
  END IF;

  -- Check for duplicate content (spam detection)
  IF is_allowed AND _content_hash IS NOT NULL THEN
    SELECT COUNT(*) INTO duplicate_count
    FROM rate_limit_actions
    WHERE professional_id = _professional_id
      AND content_hash = _content_hash
      AND created_at > now() - interval '60 minutes';

    IF duplicate_count >= 2 THEN
      is_allowed := false;
      reason := 'Se ha detectado contenido repetitivo. Por favor, varía tus mensajes.';
    END IF;
  END IF;

  -- Record the action if allowed
  IF is_allowed THEN
    INSERT INTO rate_limit_actions (professional_id, action_type, content_hash)
    VALUES (_professional_id, _action_type, _content_hash);

    -- Cleanup old records (older than 24h) for this user
    DELETE FROM rate_limit_actions
    WHERE professional_id = _professional_id
      AND created_at < now() - interval '24 hours';
  END IF;

  RETURN jsonb_build_object(
    'allowed', is_allowed,
    'reason', reason,
    'current_count', action_count,
    'max_allowed', _max_actions,
    'window_minutes', _window_minutes
  );
END;
$$;
