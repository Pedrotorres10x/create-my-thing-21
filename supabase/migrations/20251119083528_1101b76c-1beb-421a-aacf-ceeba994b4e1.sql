-- Create user_weekly_goals table
CREATE TABLE user_weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  month_start DATE NOT NULL,
  
  -- KPIs Core
  referrals_this_week INT DEFAULT 0,
  referrals_goal_week INT DEFAULT 1,
  
  meetings_this_month INT DEFAULT 0,
  meetings_goal_month INT DEFAULT 1,
  
  chapter_member_count INT DEFAULT 0,
  chapter_goal INT DEFAULT 25,
  
  -- Engagement adicional
  posts_this_week INT DEFAULT 0,
  comments_this_week INT DEFAULT 0,
  
  consecutive_weeks_with_referral INT DEFAULT 0,
  consecutive_months_with_meeting INT DEFAULT 0,
  
  last_suggestion_shown TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(professional_id, week_start, month_start)
);

-- Enable RLS
ALTER TABLE user_weekly_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own goals"
  ON user_weekly_goals FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage goals"
  ON user_weekly_goals FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to calculate user weekly goals
CREATE OR REPLACE FUNCTION calculate_user_weekly_goals(p_professional_id UUID)
RETURNS TABLE(
  referrals_this_week INT,
  meetings_this_month INT,
  chapter_member_count INT,
  days_until_week_end INT,
  days_until_month_end INT,
  posts_this_week INT,
  comments_this_week INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Referidos esta semana (lunes-domingo)
    COUNT(DISTINCT CASE 
      WHEN r.created_at >= DATE_TRUNC('week', NOW()) 
      THEN r.id 
    END)::INT as referrals_week,
    
    -- Reuniones este mes
    COUNT(DISTINCT CASE 
      WHEN m.created_at >= DATE_TRUNC('month', NOW()) 
      AND m.status IN ('confirmed', 'pending')
      THEN m.id 
    END)::INT as meetings_month,
    
    -- Miembros del capítulo
    COALESCE(c.member_count, 0)::INT as chapter_count,
    
    -- Días restantes
    (7 - EXTRACT(DOW FROM NOW())::INT) as days_week,
    (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - NOW())::INT as days_month,
    
    -- Posts esta semana
    COUNT(DISTINCT CASE 
      WHEN po.created_at >= DATE_TRUNC('week', NOW())
      THEN po.id
    END)::INT as posts_week,
    
    -- Comentarios esta semana
    COUNT(DISTINCT CASE 
      WHEN pc.created_at >= DATE_TRUNC('week', NOW())
      THEN pc.id
    END)::INT as comments_week
  FROM professionals p
  LEFT JOIN referrals r ON r.referrer_id = p.id
  LEFT JOIN meetings m ON m.requester_id = p.id
  LEFT JOIN chapters c ON c.id = p.chapter_id
  LEFT JOIN posts po ON po.professional_id = p.id
  LEFT JOIN post_comments pc ON pc.professional_id = p.id
  WHERE p.id = p_professional_id
  GROUP BY p.id, c.member_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update or insert weekly goals
CREATE OR REPLACE FUNCTION upsert_user_weekly_goals(p_professional_id UUID)
RETURNS void AS $$
DECLARE
  v_week_start DATE := DATE_TRUNC('week', NOW())::DATE;
  v_month_start DATE := DATE_TRUNC('month', NOW())::DATE;
  v_goals RECORD;
BEGIN
  -- Calculate current goals
  SELECT * INTO v_goals FROM calculate_user_weekly_goals(p_professional_id);
  
  -- Upsert the record
  INSERT INTO user_weekly_goals (
    professional_id,
    week_start,
    month_start,
    referrals_this_week,
    meetings_this_month,
    chapter_member_count,
    posts_this_week,
    comments_this_week,
    updated_at
  ) VALUES (
    p_professional_id,
    v_week_start,
    v_month_start,
    v_goals.referrals_this_week,
    v_goals.meetings_this_month,
    v_goals.chapter_member_count,
    v_goals.posts_this_week,
    v_goals.comments_this_week,
    NOW()
  )
  ON CONFLICT (professional_id, week_start, month_start)
  DO UPDATE SET
    referrals_this_week = v_goals.referrals_this_week,
    meetings_this_month = v_goals.meetings_this_month,
    chapter_member_count = v_goals.chapter_member_count,
    posts_this_week = v_goals.posts_this_week,
    comments_this_week = v_goals.comments_this_week,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update goals when referral is created
CREATE OR REPLACE FUNCTION trigger_update_referral_goal()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM upsert_user_weekly_goals(NEW.referrer_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update goals when meeting is created
CREATE OR REPLACE FUNCTION trigger_update_meeting_goal()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM upsert_user_weekly_goals(NEW.requester_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update goals when post is created
CREATE OR REPLACE FUNCTION trigger_update_post_goal()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM upsert_user_weekly_goals(NEW.professional_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update goals when comment is created
CREATE OR REPLACE FUNCTION trigger_update_comment_goal()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM upsert_user_weekly_goals(NEW.professional_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER referral_goal_update
AFTER INSERT ON referrals
FOR EACH ROW
EXECUTE FUNCTION trigger_update_referral_goal();

CREATE TRIGGER meeting_goal_update
AFTER INSERT ON meetings
FOR EACH ROW
EXECUTE FUNCTION trigger_update_meeting_goal();

CREATE TRIGGER post_goal_update
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION trigger_update_post_goal();

CREATE TRIGGER comment_goal_update
AFTER INSERT ON post_comments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_comment_goal();