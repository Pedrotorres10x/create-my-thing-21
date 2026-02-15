
CREATE OR REPLACE FUNCTION public.calculate_user_weekly_goals(p_professional_id uuid)
 RETURNS TABLE(referrals_this_week integer, meetings_this_month integer, chapter_member_count integer, days_until_week_end integer, days_until_month_end integer, posts_this_week integer, comments_this_week integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT CASE 
      WHEN r.created_at >= DATE_TRUNC('week', NOW()) 
      THEN r.id 
    END)::INT as referrals_week,
    
    COUNT(DISTINCT CASE 
      WHEN m.created_at >= DATE_TRUNC('month', NOW()) 
      AND m.status IN ('confirmed', 'pending')
      THEN m.id 
    END)::INT as meetings_month,
    
    COALESCE(c.member_count, 0)::INT as chapter_count,
    
    (7 - EXTRACT(DOW FROM NOW())::INT) as days_week,
    
    EXTRACT(DAY FROM (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - NOW()))::INT as days_month,
    
    COUNT(DISTINCT CASE 
      WHEN po.created_at >= DATE_TRUNC('week', NOW())
      THEN po.id
    END)::INT as posts_week,
    
    COUNT(DISTINCT CASE 
      WHEN pc.created_at >= DATE_TRUNC('week', NOW())
      THEN pc.id
    END)::INT as comments_week
  FROM professionals p
  LEFT JOIN referrals r ON r.referrer_id = p.id
  LEFT JOIN meetings m ON m.requester_id = p.id
  LEFT JOIN chapters c ON c.id = p.chapter_id
  LEFT JOIN posts po ON po.professional_id = p.id
  LEFT JOIN post_comments pc ON pc.professional_id = p.id
  WHERE p.id = p_professional_id
  GROUP BY p.id, c.member_count;
END;
$function$;
