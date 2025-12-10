-- Drop and recreate view without SECURITY DEFINER (use SECURITY INVOKER instead)
DROP VIEW IF EXISTS public.posts_with_visibility;

CREATE VIEW public.posts_with_visibility
WITH (security_invoker = true)
AS
SELECT 
  p.*,
  prof.full_name as author_name,
  prof.photo_url as author_photo,
  prof.business_name as author_business,
  prof.position as author_position,
  get_visibility_boost_percentage(p.professional_id) as visibility_boost
FROM posts p
JOIN professionals prof ON prof.id = p.professional_id
ORDER BY 
  visibility_boost DESC,
  p.created_at DESC;