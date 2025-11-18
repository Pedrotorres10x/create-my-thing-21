-- Create premium ad banners table
CREATE TABLE IF NOT EXISTS public.premium_ad_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  banner_image_url TEXT NOT NULL,
  banner_size TEXT NOT NULL CHECK (banner_size IN ('horizontal_large', 'horizontal_small', 'sidebar')),
  click_url TEXT NOT NULL,
  target_location TEXT NOT NULL DEFAULT 'dashboard' CHECK (target_location IN ('dashboard', 'feed', 'marketplace', 'all')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_priority INTEGER NOT NULL DEFAULT 5,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  daily_impression_limit INTEGER,
  total_impression_limit INTEGER,
  contract_reference TEXT,
  monthly_price NUMERIC(10,2),
  notes TEXT,
  created_by_admin UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create banner impressions table
CREATE TABLE IF NOT EXISTS public.banner_impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_id UUID NOT NULL REFERENCES public.premium_ad_banners(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id),
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  page_location TEXT NOT NULL,
  session_id TEXT
);

-- Create banner clicks table
CREATE TABLE IF NOT EXISTS public.banner_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_id UUID NOT NULL REFERENCES public.premium_ad_banners(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id),
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  page_location TEXT NOT NULL,
  session_id TEXT
);

-- Enable RLS
ALTER TABLE public.premium_ad_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for premium_ad_banners
CREATE POLICY "Anyone can view active banners"
  ON public.premium_ad_banners
  FOR SELECT
  USING (
    is_active = true 
    AND start_date <= now() 
    AND end_date > now()
  );

CREATE POLICY "Admins can manage banners"
  ON public.premium_ad_banners
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for banner_impressions
CREATE POLICY "Authenticated users can track impressions"
  ON public.banner_impressions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view impressions"
  ON public.banner_impressions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for banner_clicks
CREATE POLICY "Authenticated users can track clicks"
  ON public.banner_clicks
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view clicks"
  ON public.banner_clicks
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to get next banner to display with smart rotation
CREATE OR REPLACE FUNCTION public.get_next_banner_to_display(_location text)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  banner_id UUID;
BEGIN
  SELECT b.id INTO banner_id
  FROM premium_ad_banners b
  WHERE b.is_active = true
    AND b.start_date <= now()
    AND b.end_date > now()
    AND (b.target_location = _location OR b.target_location = 'all')
    AND (
      b.daily_impression_limit IS NULL 
      OR (
        SELECT COUNT(*) 
        FROM banner_impressions 
        WHERE banner_id = b.id 
          AND viewed_at >= CURRENT_DATE
      ) < b.daily_impression_limit
    )
    AND (
      b.total_impression_limit IS NULL 
      OR (
        SELECT COUNT(*) 
        FROM banner_impressions 
        WHERE banner_id = b.id
      ) < b.total_impression_limit
    )
  ORDER BY 
    b.display_priority DESC,
    (SELECT COUNT(*) FROM banner_impressions WHERE banner_id = b.id) ASC,
    RANDOM()
  LIMIT 1;
  
  RETURN banner_id;
END;
$$;

-- Function to check if banner has reached limits
CREATE OR REPLACE FUNCTION public.banner_has_reached_limits(_banner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  banner RECORD;
  daily_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT * INTO banner
  FROM premium_ad_banners
  WHERE id = _banner_id;
  
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Check daily limit
  IF banner.daily_impression_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO daily_count
    FROM banner_impressions
    WHERE banner_id = _banner_id
      AND viewed_at >= CURRENT_DATE;
    
    IF daily_count >= banner.daily_impression_limit THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Check total limit
  IF banner.total_impression_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO total_count
    FROM banner_impressions
    WHERE banner_id = _banner_id;
    
    IF total_count >= banner.total_impression_limit THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to calculate banner CTR
CREATE OR REPLACE FUNCTION public.calculate_banner_ctr(_banner_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  impressions_count INTEGER;
  clicks_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO impressions_count
  FROM banner_impressions
  WHERE banner_id = _banner_id;
  
  SELECT COUNT(*) INTO clicks_count
  FROM banner_clicks
  WHERE banner_id = _banner_id;
  
  IF impressions_count = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((clicks_count::numeric / impressions_count::numeric) * 100, 2);
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_premium_ad_banners_updated_at
  BEFORE UPDATE ON public.premium_ad_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_banner_impressions_banner_id ON public.banner_impressions(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_impressions_viewed_at ON public.banner_impressions(viewed_at);
CREATE INDEX IF NOT EXISTS idx_banner_clicks_banner_id ON public.banner_clicks(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_clicks_clicked_at ON public.banner_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_premium_ad_banners_active ON public.premium_ad_banners(is_active, start_date, end_date) WHERE is_active = true;