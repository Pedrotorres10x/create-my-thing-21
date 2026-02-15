-- Protect admin users from having their professional status changed to rejected/banned/inactive
CREATE OR REPLACE FUNCTION public.protect_admin_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If status is being changed to something other than 'approved'
  IF NEW.status != 'approved' AND (OLD.status IS NULL OR OLD.status = 'approved') THEN
    -- Check if this professional's user_id has admin role
    IF EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.user_id AND role = 'admin'
    ) THEN
      -- Prevent the status change for admins
      NEW.status := 'approved';
      NEW.moderation_blocked := false;
      NEW.moderation_block_reason := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger (runs BEFORE update so it can override the value)
DROP TRIGGER IF EXISTS protect_admin_status_trigger ON public.professionals;
CREATE TRIGGER protect_admin_status_trigger
BEFORE UPDATE ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.protect_admin_status();