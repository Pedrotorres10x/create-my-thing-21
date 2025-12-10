-- Drop and recreate can_send_ai_message function as VOLATILE to allow UPDATE operations
CREATE OR REPLACE FUNCTION public.can_send_ai_message(_professional_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  messages_limit integer;
  messages_count integer;
  reset_date timestamp with time zone;
BEGIN
  -- Get user's message limit and count
  SELECT 
    sp.ai_messages_limit,
    p.ai_messages_count,
    p.ai_messages_reset_at
  INTO messages_limit, messages_count, reset_date
  FROM professionals p
  JOIN subscription_plans sp ON sp.id = p.subscription_plan_id
  WHERE p.id = _professional_id
    AND p.subscription_status = 'active';
  
  -- If no subscription found, deny access
  IF messages_limit IS NULL AND messages_count IS NULL THEN
    RETURN false;
  END IF;
  
  -- Reset counter if month has passed
  IF reset_date < now() THEN
    UPDATE professionals
    SET ai_messages_count = 0,
        ai_messages_reset_at = date_trunc('month', now() + interval '1 month')
    WHERE id = _professional_id;
    RETURN true;
  END IF;
  
  -- NULL limit means unlimited
  IF messages_limit IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if under limit
  RETURN messages_count < messages_limit;
END;
$function$;