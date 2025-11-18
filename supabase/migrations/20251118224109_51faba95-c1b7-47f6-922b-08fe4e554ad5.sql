-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_monthly numeric(10,2),
  price_yearly numeric(10,2),
  ai_messages_limit integer, -- null means unlimited
  chapter_access_level text NOT NULL CHECK (chapter_access_level IN ('local', 'provincial', 'regional', 'national')),
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert the subscription plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, ai_messages_limit, chapter_access_level, display_order, features) VALUES
('Gratuito', 'free', 'Plan gratuito con acceso básico', 0, 0, 50, 'local', 1, '["Acceso a tu capítulo local", "50 mensajes de IA al mes", "Funcionalidades básicas"]'::jsonb),
('Provincial', 'provincial', 'Acceso a todos los capítulos de tu provincia', 29.99, 299, 200, 'provincial', 2, '["Acceso a capítulos provinciales", "200 mensajes de IA al mes", "Funcionalidades avanzadas"]'::jsonb),
('Autonómico', 'regional', 'Acceso completo a tu comunidad autónoma', 49.99, 499, NULL, 'regional', 3, '["Acceso a todos los capítulos de tu comunidad", "IA sin límites", "Funcionalidades premium", "Soporte prioritario"]'::jsonb),
('Nacional', 'national', 'Acceso total a toda España', 99, 990, NULL, 'national', 4, '["Acceso a todos los capítulos de España", "IA sin límites", "Todas las funcionalidades", "Soporte VIP", "Eventos exclusivos"]'::jsonb);

-- Add subscription fields to professionals table
ALTER TABLE public.professionals
ADD COLUMN subscription_plan_id uuid REFERENCES public.subscription_plans(id),
ADD COLUMN subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
ADD COLUMN subscription_starts_at timestamp with time zone DEFAULT now(),
ADD COLUMN subscription_ends_at timestamp with time zone,
ADD COLUMN ai_messages_count integer DEFAULT 0,
ADD COLUMN ai_messages_reset_at timestamp with time zone DEFAULT date_trunc('month', now() + interval '1 month');

-- Set default free plan for existing and new professionals
UPDATE public.professionals
SET subscription_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'free')
WHERE subscription_plan_id IS NULL;

-- Create function to check subscription access
CREATE OR REPLACE FUNCTION public.has_subscription_access(
  _professional_id uuid,
  _required_level text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_level text;
  level_hierarchy integer;
BEGIN
  -- Get user's subscription level
  SELECT sp.chapter_access_level
  INTO user_level
  FROM professionals p
  JOIN subscription_plans sp ON sp.id = p.subscription_plan_id
  WHERE p.id = _professional_id
    AND p.subscription_status = 'active';
  
  -- If no subscription found, default to local
  IF user_level IS NULL THEN
    RETURN _required_level = 'local';
  END IF;
  
  -- Define hierarchy: local < provincial < regional < national
  level_hierarchy := CASE user_level
    WHEN 'national' THEN 4
    WHEN 'regional' THEN 3
    WHEN 'provincial' THEN 2
    WHEN 'local' THEN 1
    ELSE 0
  END;
  
  RETURN level_hierarchy >= CASE _required_level
    WHEN 'national' THEN 4
    WHEN 'regional' THEN 3
    WHEN 'provincial' THEN 2
    WHEN 'local' THEN 1
    ELSE 0
  END;
END;
$$;

-- Create function to check AI message limit
CREATE OR REPLACE FUNCTION public.can_send_ai_message(_professional_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  messages_limit integer;
  messages_count integer;
  reset_date timestamp with time zone;
BEGIN
  -- Get user's message limit and count
  SELECT 
    sp.ai_messages_limit,
    p.ai_messages_count,
    p.ai_messages_reset_at
  INTO messages_limit, messages_count, reset_date
  FROM professionals p
  JOIN subscription_plans sp ON sp.id = p.subscription_plan_id
  WHERE p.id = _professional_id
    AND p.subscription_status = 'active';
  
  -- If no subscription found, deny access
  IF messages_limit IS NULL AND messages_count IS NULL THEN
    RETURN false;
  END IF;
  
  -- Reset counter if month has passed
  IF reset_date < now() THEN
    UPDATE professionals
    SET ai_messages_count = 0,
        ai_messages_reset_at = date_trunc('month', now() + interval '1 month')
    WHERE id = _professional_id;
    RETURN true;
  END IF;
  
  -- NULL limit means unlimited
  IF messages_limit IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if under limit
  RETURN messages_count < messages_limit;
END;
$$;

-- Create function to increment AI message count
CREATE OR REPLACE FUNCTION public.increment_ai_messages(_professional_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE professionals
  SET ai_messages_count = ai_messages_count + 1
  WHERE id = _professional_id;
END;
$$;

-- Create function to set default free plan for new professionals
CREATE OR REPLACE FUNCTION public.set_default_subscription_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subscription_plan_id IS NULL THEN
    NEW.subscription_plan_id := (SELECT id FROM subscription_plans WHERE slug = 'free');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to set default subscription plan
CREATE TRIGGER set_default_subscription_plan_trigger
  BEFORE INSERT ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_subscription_plan();

-- Create trigger to update updated_at on subscription_plans
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Update chapters RLS to consider subscription levels
DROP POLICY IF EXISTS "Anyone can view chapters" ON public.chapters;

CREATE POLICY "Users can view chapters based on subscription"
  ON public.chapters
  FOR SELECT
  USING (
    -- Admins can see all
    has_role(auth.uid(), 'admin')
    OR
    -- Users can see based on their subscription level
    EXISTS (
      SELECT 1 FROM professionals p
      JOIN subscription_plans sp ON sp.id = p.subscription_plan_id
      WHERE p.user_id = auth.uid()
        AND p.subscription_status = 'active'
        AND (
          -- National: see all
          sp.chapter_access_level = 'national'
          OR
          -- Regional: see same state
          (sp.chapter_access_level = 'regional' AND chapters.state = p.state)
          OR
          -- Provincial: see same state (province level would need additional field)
          (sp.chapter_access_level = 'provincial' AND chapters.state = p.state)
          OR
          -- Local: see only their chapter
          (sp.chapter_access_level = 'local' AND chapters.id = p.chapter_id)
        )
    )
  );