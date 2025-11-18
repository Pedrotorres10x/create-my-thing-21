-- Create premium marketplace slots table
CREATE TABLE IF NOT EXISTS public.premium_marketplace_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number INTEGER UNIQUE NOT NULL CHECK (slot_number BETWEEN 1 AND 30),
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  website_url TEXT,
  description TEXT NOT NULL,
  category_id INTEGER REFERENCES public.offer_categories(id),
  is_external_company BOOLEAN NOT NULL DEFAULT true,
  professional_id UUID REFERENCES public.professionals(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  contract_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  contract_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  contract_reference TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by_admin UUID REFERENCES auth.users(id)
);

-- Create marketplace waitlist table
CREATE TABLE IF NOT EXISTS public.marketplace_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  is_current_user BOOLEAN DEFAULT false,
  professional_id UUID REFERENCES public.professionals(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'converted', 'declined')),
  notes TEXT,
  contacted_at TIMESTAMP WITH TIME ZONE,
  position_in_queue INTEGER
);

-- Create premium slot views table for analytics
CREATE TABLE IF NOT EXISTS public.premium_slot_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES public.premium_marketplace_slots(id) ON DELETE CASCADE,
  viewed_by_professional_id UUID REFERENCES public.professionals(id),
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT
);

-- Function to get available slots count
CREATE OR REPLACE FUNCTION public.get_available_slots_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (30 - COUNT(*)::INTEGER)
  FROM premium_marketplace_slots
  WHERE status = 'active' 
    AND contract_end_date > now();
$$;

-- Function to update waitlist positions
CREATE OR REPLACE FUNCTION public.update_waitlist_positions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY requested_at) as new_position
    FROM marketplace_waitlist
    WHERE status = 'waiting'
  )
  UPDATE marketplace_waitlist w
  SET position_in_queue = r.new_position
  FROM ranked r
  WHERE w.id = r.id;
END;
$$;

-- Trigger to auto-update waitlist positions
CREATE OR REPLACE FUNCTION public.trigger_update_waitlist_positions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_waitlist_positions();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_waitlist_change
AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_waitlist
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_update_waitlist_positions();

-- Trigger for updated_at on premium_marketplace_slots
CREATE TRIGGER update_premium_slots_updated_at
BEFORE UPDATE ON public.premium_marketplace_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.premium_marketplace_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_slot_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for premium_marketplace_slots
CREATE POLICY "Anyone can view active premium slots"
ON public.premium_marketplace_slots
FOR SELECT
USING (status = 'active' AND contract_end_date > now());

CREATE POLICY "Admins can manage premium slots"
ON public.premium_marketplace_slots
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for marketplace_waitlist
CREATE POLICY "Users can view their own waitlist entry"
ON public.marketplace_waitlist
FOR SELECT
USING (
  professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated users can join waitlist"
ON public.marketplace_waitlist
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage waitlist"
ON public.marketplace_waitlist
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete waitlist entries"
ON public.marketplace_waitlist
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for premium_slot_views
CREATE POLICY "Authenticated users can track views"
ON public.premium_slot_views
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view analytics"
ON public.premium_slot_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'));