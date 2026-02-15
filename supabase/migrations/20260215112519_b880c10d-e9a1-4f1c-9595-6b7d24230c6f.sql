-- Fix the process_slot_liberation function to only use valid enum values
CREATE OR REPLACE FUNCTION process_slot_liberation()
RETURNS TRIGGER AS $$
DECLARE
  _next_in_queue RECORD;
BEGIN
  -- Only trigger when status changes to inactive
  IF OLD.status = 'approved' AND NEW.status = 'inactive' THEN
    SELECT w.* INTO _next_in_queue
    FROM chapter_specialization_waitlist w
    WHERE w.chapter_id = OLD.chapter_id
      AND w.profession_specialization_id = OLD.profession_specialization_id
      AND w.status = 'waiting'
    ORDER BY w.position_in_queue ASC
    LIMIT 1;

    IF _next_in_queue IS NOT NULL THEN
      UPDATE professionals
      SET chapter_id = _next_in_queue.chapter_id,
          profession_specialization_id = _next_in_queue.profession_specialization_id,
          status = 'approved'
      WHERE id = _next_in_queue.professional_id;

      UPDATE chapter_specialization_waitlist
      SET status = 'assigned',
          assigned_at = now(),
          updated_at = now()
      WHERE id = _next_in_queue.id;

      INSERT INTO lovable_messages (professional_id, title, content, message_type, tone, trigger_state)
      VALUES (
        _next_in_queue.professional_id,
        '¡Plaza disponible asignada!',
        '¡Enhorabuena! Se ha liberado una plaza en tu capítulo para tu especialización y has sido asignado automáticamente.',
        'achievement',
        'celebratory',
        'waitlist_assigned'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;