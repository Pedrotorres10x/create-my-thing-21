-- Add existing member approval tracking to conflict requests
ALTER TABLE public.specialization_conflict_requests 
ADD COLUMN IF NOT EXISTS existing_member_approval text DEFAULT 'pending' CHECK (existing_member_approval IN ('pending', 'approved', 'rejected'));

-- Add comment for clarity
COMMENT ON COLUMN public.specialization_conflict_requests.existing_member_approval IS 'Approval from the existing member with same profession: pending, approved, rejected. Must be approved before going to committee.';