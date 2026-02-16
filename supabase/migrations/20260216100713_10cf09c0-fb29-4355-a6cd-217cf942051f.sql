-- Set daily AI message limits per plan
-- Free: 30 messages/day, Local Pro: 50, Premium: 100, Regional: unlimited (NULL)
UPDATE subscription_plans SET ai_messages_limit = 30 WHERE slug = 'free';
UPDATE subscription_plans SET ai_messages_limit = 50 WHERE slug = 'provincial';
UPDATE subscription_plans SET ai_messages_limit = 100 WHERE slug = 'premium';
UPDATE subscription_plans SET ai_messages_limit = NULL WHERE slug = 'regional';

-- Add daily reset column to professionals
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS ai_messages_daily_count integer NOT NULL DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS ai_messages_daily_reset_at timestamp with time zone NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day');

-- Update the can_send_ai_message function to use daily limits
CREATE OR REPLACE FUNCTION public.can_send_ai_message(_professional_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  messages_limit integer;
  daily_count integer;
  daily_reset timestamp with time zone;
BEGIN
  -- Get user's message limit and daily count
  SELECT 
    sp.ai_messages_limit,
    p.ai_messages_daily_count,
    p.ai_messages_daily_reset_at
  INTO messages_limit, daily_count, daily_reset
  FROM professionals p
  JOIN subscription_plans sp ON sp.id = p.subscription_plan_id
  WHERE p.id = _professional_id;
  
  -- If no subscription found, deny access
  IF messages_limit IS NULL AND daily_count IS NULL THEN
    RETURN false;
  END IF;
  
  -- Reset counter if day has passed
  IF daily_reset <= now() THEN
    UPDATE professionals
    SET ai_messages_daily_count = 0,
        ai_messages_daily_reset_at = (CURRENT_DATE + INTERVAL '1 day')
    WHERE id = _professional_id;
    RETURN true;
  END IF;
  
  -- NULL limit means unlimited
  IF messages_limit IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if under daily limit
  RETURN daily_count < messages_limit;
END;
$function$;

-- Update the increment function to use daily counter
CREATE OR REPLACE FUNCTION public.increment_ai_messages(_professional_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calling_user_id uuid;
  daily_reset timestamp with time zone;
BEGIN
  -- Get the user_id associated with this professional_id
  SELECT user_id, ai_messages_daily_reset_at INTO calling_user_id, daily_reset
  FROM professionals
  WHERE id = _professional_id;
  
  -- Verify the caller owns this professional record
  IF calling_user_id IS NULL OR calling_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot increment AI messages for this professional';
  END IF;
  
  -- Reset if new day
  IF daily_reset <= now() THEN
    UPDATE professionals
    SET ai_messages_daily_count = 1,
        ai_messages_daily_reset_at = (CURRENT_DATE + INTERVAL '1 day')
    WHERE id = _professional_id AND user_id = auth.uid();
  ELSE
    UPDATE professionals
    SET ai_messages_daily_count = ai_messages_daily_count + 1
    WHERE id = _professional_id AND user_id = auth.uid();
  END IF;
END;
$function$;