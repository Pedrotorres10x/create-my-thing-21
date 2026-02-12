
-- Add commission fields to deals
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS declared_profit NUMERIC,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS commission_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS commission_due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMPTZ;

-- Update the deal counters function to calculate commission automatically
CREATE OR REPLACE FUNCTION public.update_deal_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at := now();
    NEW.commission_amount := COALESCE(NEW.declared_profit, 0) * 0.10;
    NEW.commission_status := 'pending';
    NEW.commission_due_date := now() + INTERVAL '30 days';
    
    -- Update referrer stats (deals_completed only)
    UPDATE professionals
    SET deals_completed = deals_completed + 1
    WHERE id = NEW.referrer_id;
    
    -- Update receiver stats (deals_completed + total_deal_value based on declared_profit)
    UPDATE professionals
    SET deals_completed = deals_completed + 1,
        total_deal_value = total_deal_value + COALESCE(NEW.declared_profit, 0)
    WHERE id = NEW.receiver_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to mark overdue commissions
CREATE OR REPLACE FUNCTION public.check_overdue_commissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE deals
  SET commission_status = 'overdue'
  WHERE commission_status = 'pending'
    AND commission_due_date < now()
    AND status = 'completed';
END;
$$;
