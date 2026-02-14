
-- 1. Add founder flag to professionals
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS is_chapter_founder boolean DEFAULT false;

-- 2. Create committee rotation history table
CREATE TABLE public.committee_rotations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id),
  rotation_date timestamp with time zone NOT NULL DEFAULT now(),
  member_1_id uuid REFERENCES public.professionals(id),
  member_2_id uuid REFERENCES public.professionals(id),
  member_3_id uuid REFERENCES public.professionals(id),
  is_founding boolean DEFAULT false,
  next_rotation_at timestamp with time zone NOT NULL DEFAULT (now() + interval '6 months'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.committee_rotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view committee rotations"
  ON public.committee_rotations FOR SELECT USING (true);

CREATE POLICY "Service can manage rotations"
  ON public.committee_rotations FOR ALL USING (auth.uid() IS NULL);

CREATE POLICY "Admins can manage rotations"
  ON public.committee_rotations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Insert the "Fundador" badge
INSERT INTO public.badges (code, name, description, icon, category)
VALUES ('founder', 'Fundador', 'Uno de los 3 primeros miembros de la Tribu', '🏛️', 'special')
ON CONFLICT DO NOTHING;

-- 4. Replace get_ethics_committee_members to be per-chapter
CREATE OR REPLACE FUNCTION public.get_ethics_committee_members(_chapter_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, full_name text, email text, total_points integer, photo_url text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.total_points,
    p.photo_url
  FROM professionals p
  WHERE p.status = 'approved'
    AND p.moderation_blocked = false
    AND (
      _chapter_id IS NULL 
      OR p.chapter_id = _chapter_id
    )
  ORDER BY p.total_points DESC
  LIMIT 3;
$$;

-- 5. Update is_ethics_committee_member to check within same chapter
CREATE OR REPLACE FUNCTION public.is_ethics_committee_member(_professional_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT p2.id
      FROM professionals p1
      JOIN professionals p2 ON p2.chapter_id = p1.chapter_id
      WHERE p1.id = _professional_id
        AND p1.chapter_id IS NOT NULL
        AND p2.status = 'approved'
        AND p2.moderation_blocked = false
      ORDER BY p2.total_points DESC
      LIMIT 3
    ) top3
    WHERE top3.id = _professional_id
  );
$$;

-- 6. Function to assign founders when chapter reaches 3 members
CREATE OR REPLACE FUNCTION public.assign_chapter_founders()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _chapter_member_count integer;
  _founder_badge_id uuid;
  _member record;
BEGIN
  -- Only trigger when chapter_id is set or changed
  IF NEW.chapter_id IS NULL THEN RETURN NEW; END IF;
  IF OLD IS NOT NULL AND OLD.chapter_id = NEW.chapter_id THEN RETURN NEW; END IF;

  -- Count members in chapter
  SELECT COUNT(*) INTO _chapter_member_count
  FROM professionals WHERE chapter_id = NEW.chapter_id;

  -- Check if this chapter already has founders
  IF EXISTS (SELECT 1 FROM professionals WHERE chapter_id = NEW.chapter_id AND is_chapter_founder = true) THEN
    RETURN NEW;
  END IF;

  -- If chapter just reached 3 members, assign founders
  IF _chapter_member_count >= 3 THEN
    SELECT id INTO _founder_badge_id FROM badges WHERE code = 'founder' LIMIT 1;
    
    FOR _member IN 
      SELECT id FROM professionals 
      WHERE chapter_id = NEW.chapter_id 
      ORDER BY created_at ASC 
      LIMIT 3
    LOOP
      UPDATE professionals SET is_chapter_founder = true WHERE id = _member.id;
      
      -- Award founder badge
      IF _founder_badge_id IS NOT NULL THEN
        INSERT INTO professional_badges (professional_id, badge_id)
        VALUES (_member.id, _founder_badge_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;

    -- Create first committee rotation
    INSERT INTO committee_rotations (chapter_id, is_founding, member_1_id, member_2_id, member_3_id)
    SELECT NEW.chapter_id, true, 
      (SELECT id FROM professionals WHERE chapter_id = NEW.chapter_id ORDER BY created_at ASC LIMIT 1 OFFSET 0),
      (SELECT id FROM professionals WHERE chapter_id = NEW.chapter_id ORDER BY created_at ASC LIMIT 1 OFFSET 1),
      (SELECT id FROM professionals WHERE chapter_id = NEW.chapter_id ORDER BY created_at ASC LIMIT 1 OFFSET 2);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_assign_chapter_founders ON professionals;
CREATE TRIGGER trg_assign_chapter_founders
  AFTER UPDATE OF chapter_id ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION assign_chapter_founders();

-- Also trigger on insert with chapter_id
DROP TRIGGER IF EXISTS trg_assign_chapter_founders_insert ON professionals;
CREATE TRIGGER trg_assign_chapter_founders_insert
  AFTER INSERT ON professionals
  FOR EACH ROW
  WHEN (NEW.chapter_id IS NOT NULL)
  EXECUTE FUNCTION assign_chapter_founders();
