-- Create enums
CREATE TYPE professional_status AS ENUM ('waiting_approval', 'approved', 'rejected', 'inactive');
CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'approved');

-- Professionals table
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT NOT NULL,
  business_description TEXT,
  sector_id INTEGER NOT NULL,
  specialization_id INTEGER NOT NULL,
  years_experience INTEGER,
  website TEXT,
  linkedin TEXT,
  logo_url TEXT,
  photo_url TEXT,
  video_url TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  status professional_status NOT NULL DEFAULT 'waiting_approval',
  referral_code TEXT UNIQUE,
  referred_by_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_professionals_user_id ON professionals(user_id);
CREATE INDEX idx_professionals_status ON professionals(status);
CREATE INDEX idx_professionals_referral_code ON professionals(referral_code);

-- Enable RLS
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- Professionals policies
CREATE POLICY "Users can view approved professionals"
  ON professionals FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON professionals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON professionals FOR UPDATE
  USING (user_id = auth.uid());

-- Referrals table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  referred_email TEXT NOT NULL,
  status referral_status NOT NULL DEFAULT 'pending',
  reward_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referrer_id, referred_email)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Referrals policies
CREATE POLICY "Users can view their own referrals as referrer"
  ON referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = referrals.referrer_id 
      AND professionals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = referrer_id 
      AND professionals.user_id = auth.uid()
    )
  );

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM professionals WHERE referral_code = code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to auto-generate referral code
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_referral_code
  BEFORE INSERT ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code();

-- Function to track referral completion
CREATE OR REPLACE FUNCTION track_referral_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_prof_id UUID;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE referrals
    SET 
      referred_id = NEW.id,
      status = 'completed',
      completed_at = now(),
      reward_points = 100
    WHERE referred_email = NEW.email
      AND status = 'pending'
    RETURNING referrer_id INTO referrer_prof_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_track_referral_completion
  AFTER INSERT OR UPDATE ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION track_referral_completion();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_professionals_updated_at
  BEFORE UPDATE ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();