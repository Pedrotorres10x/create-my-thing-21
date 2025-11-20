-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view professionals" ON public.professionals;

-- Create a new restrictive policy: users can only view their own full profile
CREATE POLICY "Users can view their own profile"
ON public.professionals
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Create a public view with only non-sensitive fields for directory purposes
CREATE OR REPLACE VIEW public.professionals_public AS
SELECT 
  id,
  business_name,
  business_description,
  city,
  state,
  country,
  sector_id,
  specialization_id,
  profession_specialization_id,
  business_sphere_id,
  chapter_id,
  years_experience,
  total_points,
  status,
  logo_url,
  photo_url,
  video_url,
  website,
  linkedin_url,
  position,
  bio,
  created_at,
  updated_at
FROM public.professionals
WHERE status = 'approved'::professional_status;

-- Enable RLS on the view
ALTER VIEW public.professionals_public SET (security_invoker = true);

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.professionals_public TO authenticated;
GRANT SELECT ON public.professionals_public TO anon;