-- Create app_role enum
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Update professionals policies to allow admins
DROP POLICY IF EXISTS "Users can view approved professionals" ON professionals;

CREATE POLICY "Users can view professionals"
  ON professionals FOR SELECT
  USING (
    status = 'approved' 
    OR user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update professionals"
  ON professionals FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Update referrals policies
CREATE POLICY "Admins can view all referrals"
  ON referrals FOR SELECT
  USING (has_role(auth.uid(), 'admin'));