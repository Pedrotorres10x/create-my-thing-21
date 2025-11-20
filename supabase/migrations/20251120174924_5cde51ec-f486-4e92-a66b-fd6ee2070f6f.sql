-- Fix critical security vulnerabilities in SECURITY DEFINER functions
-- These functions bypass RLS, so they must validate access internally

-- 1. Fix increment_ai_messages - Add ownership validation
-- CRITICAL: Currently allows anyone to increment AI messages for any user
CREATE OR REPLACE FUNCTION public.increment_ai_messages(_professional_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id uuid;
BEGIN
  -- Get the user_id associated with this professional_id
  SELECT user_id INTO calling_user_id
  FROM professionals
  WHERE id = _professional_id;
  
  -- Verify the caller owns this professional record
  IF calling_user_id IS NULL OR calling_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot increment AI messages for this professional';
  END IF;
  
  -- Only increment if ownership verified
  UPDATE professionals
  SET ai_messages_count = ai_messages_count + 1
  WHERE id = _professional_id AND user_id = auth.uid();
END;
$$;

-- 2. Improve update_professional_points - Add validation
-- Prevents silent failures if referrer doesn't exist
CREATE OR REPLACE FUNCTION public.update_professional_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_prof_id UUID;
  points_to_add INTEGER;
BEGIN
  -- Only when a referral is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    referrer_prof_id := NEW.referrer_id;
    points_to_add := COALESCE(NEW.reward_points, 100);
    
    -- Verify referrer exists before updating
    IF NOT EXISTS (SELECT 1 FROM professionals WHERE id = referrer_prof_id) THEN
      RAISE WARNING 'Referrer professional % not found, skipping points update', referrer_prof_id;
      RETURN NEW;
    END IF;
    
    -- Update points for the referrer
    UPDATE professionals
    SET total_points = total_points + points_to_add
    WHERE id = referrer_prof_id;
    
    -- Record the transaction
    INSERT INTO point_transactions (professional_id, points, reason, referral_id)
    VALUES (referrer_prof_id, points_to_add, 'Referido completado', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.increment_ai_messages IS 'Increments AI message count with ownership validation - only the professional owner can increment their own count';
COMMENT ON FUNCTION public.update_professional_points IS 'Updates professional points with referrer existence validation to prevent silent failures';