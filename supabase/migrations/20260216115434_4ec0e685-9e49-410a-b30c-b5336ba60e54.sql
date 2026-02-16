
-- Update AI message limits
UPDATE subscription_plans SET ai_messages_limit = 15 WHERE slug = 'free';
UPDATE subscription_plans SET ai_messages_limit = 50 WHERE slug = 'premium';

-- Update can_send_ai_message to give 30 msgs during first 15 days
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
  prof_created_at timestamp with time zone;
  effective_limit integer;
BEGIN
  -- Get user's message limit, daily count, and creation date
  SELECT 
    sp.ai_messages_limit,
    p.ai_messages_daily_count,
    p.ai_messages_daily_reset_at,
    p.created_at
  INTO messages_limit, daily_count, daily_reset, prof_created_at
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
    daily_count := 0;
  END IF;
  
  -- NULL limit means unlimited
  IF messages_limit IS NULL THEN
    RETURN true;
  END IF;
  
  -- First 15 days bonus: free users get 30 msgs instead of 15
  effective_limit := messages_limit;
  IF messages_limit = 15 AND prof_created_at > now() - interval '15 days' THEN
    effective_limit := 30;
  END IF;
  
  -- Check if under daily limit
  RETURN daily_count < effective_limit;
END;
$function$;
