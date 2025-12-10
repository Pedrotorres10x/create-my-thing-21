-- Function to check if a professional has active visibility boost
CREATE OR REPLACE FUNCTION public.has_visibility_boost(_professional_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_micro_rewards umr
    JOIN micro_reward_types mrt ON mrt.id = umr.reward_type_id
    WHERE umr.professional_id = _professional_id
      AND umr.status = 'active'
      AND mrt.category = 'visibility'
      AND (umr.expires_at IS NULL OR umr.expires_at > now())
  );
END;
$function$;

-- Function to get visibility boost percentage (for sorting/prioritization)
CREATE OR REPLACE FUNCTION public.get_visibility_boost_percentage(_professional_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  boost_percent integer := 0;
BEGIN
  -- Check for active visibility rewards and sum their boost effect
  SELECT COALESCE(SUM(
    CASE mrt.code
      WHEN 'VISIBILITY_BOOST_20' THEN 20
      WHEN 'VISIBILITY_BOOST_PRIORITY' THEN 30
      WHEN 'RETURNING_BOOST' THEN 20
      WHEN 'WELCOME_BACK_BOOST' THEN 10
      ELSE 10
    END
  ), 0)
  INTO boost_percent
  FROM user_micro_rewards umr
  JOIN micro_reward_types mrt ON mrt.id = umr.reward_type_id
  WHERE umr.professional_id = _professional_id
    AND umr.status = 'active'
    AND mrt.category IN ('visibility', 'boost')
    AND (umr.expires_at IS NULL OR umr.expires_at > now());
    
  -- Cap at 50% to avoid excessive boosting
  RETURN LEAST(boost_percent, 50);
END;
$function$;

-- View for posts with visibility boost consideration
CREATE OR REPLACE VIEW public.posts_with_visibility AS
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