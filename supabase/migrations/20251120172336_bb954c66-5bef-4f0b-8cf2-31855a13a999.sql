-- Create a view for posts with public author information
-- This allows the Feed to display posts without direct JOINs to the professionals table
CREATE OR REPLACE VIEW public.posts_with_authors AS
SELECT 
  p.id,
  p.content,
  p.image_url,
  p.created_at,
  p.updated_at,
  p.professional_id,
  pp.full_name as author_name,
  pp.photo_url as author_photo,
  pp.business_name as author_business,
  pp.position as author_position
FROM posts p
INNER JOIN professionals_public pp ON pp.id = p.professional_id;

-- Enable security invoker for the view
ALTER VIEW public.posts_with_authors SET (security_invoker = true);

-- Grant access
GRANT SELECT ON public.posts_with_authors TO authenticated;
GRANT SELECT ON public.posts_with_authors TO anon;