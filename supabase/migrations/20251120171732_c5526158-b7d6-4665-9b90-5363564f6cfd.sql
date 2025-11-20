-- Drop and recreate the view with full_name included
DROP VIEW IF EXISTS public.professionals_public;

CREATE VIEW public.professionals_public AS
SELECT 
  id,
  full_name,
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
  company_name,
  created_at,
  updated_at
FROM public.professionals
WHERE status = 'approved'::professional_status;

-- Enable RLS on the view
ALTER VIEW public.professionals_public SET (security_invoker = true);

-- Grant SELECT on the view
GRANT SELECT ON public.professionals_public TO authenticated;
GRANT SELECT ON public.professionals_public TO anon;