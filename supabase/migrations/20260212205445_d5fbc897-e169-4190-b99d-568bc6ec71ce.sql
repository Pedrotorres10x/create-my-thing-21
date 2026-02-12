
-- Table: chapter_specialization_waitlist
-- Tracks professionals waiting for a specific specialization slot in a chapter
CREATE TABLE public.chapter_specialization_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  profession_specialization_id INTEGER NOT NULL REFERENCES public.profession_specializations(id),
  position_in_queue INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, notified, assigned, cancelled
  notified_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- when notification expires (e.g. 7 days to confirm)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(professional_id, chapter_id, profession_specialization_id)
);

ALTER TABLE public.chapter_specialization_waitlist ENABLE ROW LEVEL SECURITY;

-- Users can view their own waitlist entries
CREATE POLICY "Users can view own waitlist entries"
  ON public.chapter_specialization_waitlist FOR SELECT
  USING (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

-- Users can join the waitlist
CREATE POLICY "Users can join waitlist"
  ON public.chapter_specialization_waitlist FOR INSERT
  WITH CHECK (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

-- Users can cancel their own waitlist entries
CREATE POLICY "Users can cancel own waitlist entries"
  ON public.chapter_specialization_waitlist FOR UPDATE
  USING (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

-- Admins can manage all
CREATE POLICY "Admins can manage waitlist"
  ON public.chapter_specialization_waitlist FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage (for edge functions)
CREATE POLICY "Service can manage waitlist"
  ON public.chapter_specialization_waitlist FOR ALL
  USING (auth.uid() IS NULL);

-- Function to auto-assign waitlist position
CREATE OR REPLACE FUNCTION public.assign_waitlist_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.position_in_queue := COALESCE(
    (SELECT MAX(position_in_queue) + 1
     FROM chapter_specialization_waitlist
     WHERE chapter_id = NEW.chapter_id
       AND profession_specialization_id = NEW.profession_specialization_id
       AND status = 'waiting'),
    1
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_waitlist_position
  BEFORE INSERT ON public.chapter_specialization_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_waitlist_position();

-- Function to process slot liberation when a professional is deactivated/expelled
CREATE OR REPLACE FUNCTION public.process_slot_liberation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next_in_queue RECORD;
BEGIN
  -- Only trigger when status changes to inactive, banned, or suspended
  IF OLD.status = 'approved' AND NEW.status IN ('inactive', 'banned') THEN
    -- Find the next person in the waitlist for this slot
    SELECT w.* INTO _next_in_queue
    FROM chapter_specialization_waitlist w
    WHERE w.chapter_id = OLD.chapter_id
      AND w.profession_specialization_id = OLD.profession_specialization_id
      AND w.status = 'waiting'
    ORDER BY w.position_in_queue ASC
    LIMIT 1;

    IF _next_in_queue IS NOT NULL THEN
      -- Auto-assign: update the waitlisted professional
      UPDATE professionals
      SET chapter_id = _next_in_queue.chapter_id,
          profession_specialization_id = _next_in_queue.profession_specialization_id,
          status = 'approved'
      WHERE id = _next_in_queue.professional_id;

      -- Mark waitlist entry as assigned
      UPDATE chapter_specialization_waitlist
      SET status = 'assigned',
          assigned_at = now(),
          updated_at = now()
      WHERE id = _next_in_queue.id;

      -- Notify the newly assigned professional via Alic.ia
      INSERT INTO lovable_messages (professional_id, title, content, message_type, tone, trigger_state)
      VALUES (
        _next_in_queue.professional_id,
        '¡Plaza disponible asignada!',
        '¡Enhorabuena! Se ha liberado una plaza en tu capítulo para tu especialización y has sido asignado automáticamente. Ya formas parte del grupo. ¡Bienvenido a tu Trinchera!',
        'achievement',
        'celebratory',
        'waitlist_assigned'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_professional_status_change
  AFTER UPDATE OF status ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.process_slot_liberation();
