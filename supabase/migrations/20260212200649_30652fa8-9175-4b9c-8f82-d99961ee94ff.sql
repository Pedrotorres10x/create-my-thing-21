
-- Table to track deals (tratos) between members
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.professionals(id),
  receiver_id UUID NOT NULL REFERENCES public.professionals(id),
  description TEXT NOT NULL,
  deal_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Users can view deals they're part of
CREATE POLICY "Users can view own deals"
ON public.deals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM professionals
    WHERE professionals.user_id = auth.uid()
    AND (professionals.id = deals.referrer_id OR professionals.id = deals.receiver_id)
  )
);

-- Users can create deals where they are the referrer
CREATE POLICY "Users can create deals as referrer"
ON public.deals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM professionals
    WHERE professionals.user_id = auth.uid()
    AND professionals.id = deals.referrer_id
  )
);

-- Users can update deals they're part of
CREATE POLICY "Users can update own deals"
ON public.deals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM professionals
    WHERE professionals.user_id = auth.uid()
    AND (professionals.id = deals.referrer_id OR professionals.id = deals.receiver_id)
  )
);

-- Admins can see all deals
CREATE POLICY "Admins can view all deals"
ON public.deals FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add deals_completed counter to professionals for quick access
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS deals_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS total_deal_value NUMERIC NOT NULL DEFAULT 0;

-- Function to update deal counters when a deal is completed
CREATE OR REPLACE FUNCTION public.update_deal_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at := now();
    
    -- Update referrer stats
    UPDATE professionals
    SET deals_completed = deals_completed + 1,
        total_deal_value = total_deal_value + COALESCE(NEW.deal_value, 0)
    WHERE id = NEW.referrer_id;
    
    -- Update receiver stats
    UPDATE professionals
    SET deals_completed = deals_completed + 1,
        total_deal_value = total_deal_value + COALESCE(NEW.deal_value, 0)
    WHERE id = NEW.receiver_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_deal_completed
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_deal_counters();

-- Updated_at trigger
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
