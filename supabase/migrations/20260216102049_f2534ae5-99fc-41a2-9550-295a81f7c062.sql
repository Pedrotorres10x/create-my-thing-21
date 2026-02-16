
-- Change auto-block to notify admin instead of blocking
CREATE OR REPLACE FUNCTION public.check_auto_block_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  violation_count INTEGER;
  prof_name TEXT;
BEGIN
  -- Count high severity violations for this user in last 30 days
  SELECT COUNT(*)
  INTO violation_count
  FROM moderation_violations
  WHERE user_id = NEW.user_id
    AND severity = 'high'
    AND created_at > NOW() - INTERVAL '30 days';

  -- If 3 or more high severity violations, notify admin instead of blocking
  IF violation_count >= 3 THEN
    -- Get professional name for the notification
    SELECT full_name INTO prof_name
    FROM professionals
    WHERE user_id = NEW.user_id
    LIMIT 1;

    -- Create admin notification
    INSERT INTO admin_notifications (
      notification_type, title, description, severity,
      related_professional_id, metadata
    )
    SELECT
      'content_moderation',
      '🚨 Usuario con múltiples violaciones: ' || COALESCE(prof_name, 'Desconocido'),
      'Este usuario ha acumulado ' || violation_count || ' violaciones de contenido de alta severidad en los últimos 30 días. Requiere revisión manual para decidir si bloquear la cuenta.',
      'high',
      p.id,
      jsonb_build_object('violation_count', violation_count, 'user_id', NEW.user_id)
    FROM professionals p
    WHERE p.user_id = NEW.user_id
    LIMIT 1;

    NEW.blocked = FALSE;
  END IF;

  RETURN NEW;
END;
$$;
