-- Crear tabla de tracking de actividad de usuarios
CREATE TABLE IF NOT EXISTS user_activity_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  last_login timestamp with time zone DEFAULT now(),
  last_post_created timestamp with time zone,
  last_comment timestamp with time zone,
  last_like timestamp with time zone,
  last_offer_contact timestamp with time zone,
  last_meeting_request timestamp with time zone,
  activity_score integer DEFAULT 0,
  inactivity_days integer DEFAULT 0,
  reengagement_stage text DEFAULT 'active' CHECK (reengagement_stage IN ('active', 'at_risk', 'inactive', 'dormant')),
  last_notification_sent timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(professional_id)
);

ALTER TABLE user_activity_tracking ENABLE ROW LEVEL SECURITY;

-- RLS: Admins pueden ver todo
CREATE POLICY "Admins can view all activity tracking"
ON user_activity_tracking
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- RLS: Usuarios pueden ver su propio tracking
CREATE POLICY "Users can view their own activity tracking"
ON user_activity_tracking
FOR SELECT
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
);

-- RLS: Sistema puede insertar y actualizar
CREATE POLICY "System can manage activity tracking"
ON user_activity_tracking
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_activity_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_activity_tracking_updated_at ON user_activity_tracking;
CREATE TRIGGER update_activity_tracking_updated_at
  BEFORE UPDATE ON user_activity_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_tracking_timestamp();

-- Función para actualizar last_post_created
CREATE OR REPLACE FUNCTION track_post_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity_tracking (professional_id, last_post_created)
  VALUES (NEW.professional_id, now())
  ON CONFLICT (professional_id)
  DO UPDATE SET 
    last_post_created = now(),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para posts
DROP TRIGGER IF EXISTS track_post_creation_trigger ON posts;
CREATE TRIGGER track_post_creation_trigger
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION track_post_creation();

-- Función para actualizar last_comment
CREATE OR REPLACE FUNCTION track_comment_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity_tracking (professional_id, last_comment)
  VALUES (NEW.professional_id, now())
  ON CONFLICT (professional_id)
  DO UPDATE SET 
    last_comment = now(),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para comentarios
DROP TRIGGER IF EXISTS track_comment_creation_trigger ON post_comments;
CREATE TRIGGER track_comment_creation_trigger
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION track_comment_creation();

-- Función para actualizar last_like
CREATE OR REPLACE FUNCTION track_like_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity_tracking (professional_id, last_like)
  VALUES (NEW.professional_id, now())
  ON CONFLICT (professional_id)
  DO UPDATE SET 
    last_like = now(),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para likes
DROP TRIGGER IF EXISTS track_like_creation_trigger ON post_likes;
CREATE TRIGGER track_like_creation_trigger
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION track_like_creation();

-- Función para actualizar last_offer_contact
CREATE OR REPLACE FUNCTION track_offer_contact()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity_tracking (professional_id, last_offer_contact)
  VALUES (NEW.interested_professional_id, now())
  ON CONFLICT (professional_id)
  DO UPDATE SET 
    last_offer_contact = now(),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para contactos de ofertas
DROP TRIGGER IF EXISTS track_offer_contact_trigger ON offer_contacts;
CREATE TRIGGER track_offer_contact_trigger
  AFTER INSERT ON offer_contacts
  FOR EACH ROW
  EXECUTE FUNCTION track_offer_contact();

-- Función para actualizar last_meeting_request
CREATE OR REPLACE FUNCTION track_meeting_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity_tracking (professional_id, last_meeting_request)
  VALUES (NEW.requester_id, now())
  ON CONFLICT (professional_id)
  DO UPDATE SET 
    last_meeting_request = now(),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para solicitudes de reuniones
DROP TRIGGER IF EXISTS track_meeting_request_trigger ON meetings;
CREATE TRIGGER track_meeting_request_trigger
  AFTER INSERT ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION track_meeting_request();

-- Función para calcular activity score
CREATE OR REPLACE FUNCTION calculate_activity_score(_professional_id uuid)
RETURNS integer AS $$
DECLARE
  score integer := 0;
  days_since_login integer;
  posts_count integer;
  comments_count integer;
  likes_count integer;
  contacts_count integer;
  meetings_count integer;
BEGIN
  -- Calcular días desde último login
  SELECT COALESCE(EXTRACT(DAY FROM now() - last_login)::integer, 999)
  INTO days_since_login
  FROM user_activity_tracking
  WHERE professional_id = _professional_id;
  
  -- Puntos por login reciente (últimos 30 días)
  IF days_since_login <= 30 THEN
    score := score + (30 - days_since_login) * 5;
  END IF;
  
  -- Contar actividades últimos 30 días
  SELECT COUNT(*) INTO posts_count
  FROM posts
  WHERE professional_id = _professional_id
    AND created_at > now() - interval '30 days';
  
  SELECT COUNT(*) INTO comments_count
  FROM post_comments
  WHERE professional_id = _professional_id
    AND created_at > now() - interval '30 days';
  
  SELECT COUNT(*) INTO likes_count
  FROM post_likes
  WHERE professional_id = _professional_id
    AND created_at > now() - interval '30 days';
  
  SELECT COUNT(*) INTO contacts_count
  FROM offer_contacts
  WHERE interested_professional_id = _professional_id
    AND created_at > now() - interval '30 days';
  
  SELECT COUNT(*) INTO meetings_count
  FROM meetings
  WHERE (requester_id = _professional_id OR recipient_id = _professional_id)
    AND created_at > now() - interval '30 days';
  
  -- Sumar puntos por actividades
  score := score + (posts_count * 20);
  score := score + (comments_count * 10);
  score := score + (likes_count * 3);
  score := score + (contacts_count * 30);
  score := score + (meetings_count * 50);
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para determinar el stage de reengagement
CREATE OR REPLACE FUNCTION determine_reengagement_stage(
  _activity_score integer,
  _inactivity_days integer
)
RETURNS text AS $$
BEGIN
  IF _activity_score > 100 AND _inactivity_days < 7 THEN
    RETURN 'active';
  ELSIF _activity_score BETWEEN 50 AND 100 AND _inactivity_days BETWEEN 7 AND 14 THEN
    RETURN 'at_risk';
  ELSIF _activity_score BETWEEN 10 AND 50 AND _inactivity_days BETWEEN 14 AND 21 THEN
    RETURN 'inactive';
  ELSE
    RETURN 'dormant';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_activity_tracking_professional ON user_activity_tracking(professional_id);
CREATE INDEX IF NOT EXISTS idx_activity_tracking_stage ON user_activity_tracking(reengagement_stage);
CREATE INDEX IF NOT EXISTS idx_activity_tracking_last_login ON user_activity_tracking(last_login);

COMMENT ON TABLE user_activity_tracking IS 'Tracking de actividad de usuarios para sistema de re-engagement';
COMMENT ON COLUMN user_activity_tracking.activity_score IS 'Puntuación calculada basada en actividades recientes (últimos 30 días)';
COMMENT ON COLUMN user_activity_tracking.inactivity_days IS 'Días desde la última actividad significativa';
COMMENT ON COLUMN user_activity_tracking.reengagement_stage IS 'Etapa de engagement: active, at_risk, inactive, dormant';