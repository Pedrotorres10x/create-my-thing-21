
-- RPC: find_top_professionals_by_specialization
CREATE OR REPLACE FUNCTION public.find_top_professionals_by_specialization(
  p_specialization_id integer DEFAULT NULL,
  p_profession_specialization_id integer DEFAULT NULL,
  p_exclude_chapter_id uuid DEFAULT NULL
)
RETURNS TABLE (
  professional_id uuid,
  professional_name text,
  professional_photo text,
  professional_position text,
  professional_company text,
  professional_points integer,
  professional_chapter_id uuid,
  chapter_name text,
  chapter_city text,
  specialization_name text,
  rank_in_chapter bigint
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      p.id,
      p.full_name,
      p.photo_url,
      p.position,
      p.company_name,
      p.total_points,
      p.chapter_id,
      c.name AS c_name,
      c.city AS c_city,
      COALESCE(ps.name, s.name) AS s_name,
      ROW_NUMBER() OVER (PARTITION BY p.chapter_id ORDER BY p.total_points DESC) AS rn
    FROM professionals p
    LEFT JOIN chapters c ON c.id = p.chapter_id
    LEFT JOIN specializations s ON s.id = p.specialization_id
    LEFT JOIN profession_specializations ps ON ps.id = p.profession_specialization_id
    WHERE p.status = 'approved'
      AND (p_exclude_chapter_id IS NULL OR p.chapter_id IS DISTINCT FROM p_exclude_chapter_id)
      AND (
        (p_specialization_id IS NOT NULL AND p.specialization_id = p_specialization_id)
        OR (p_profession_specialization_id IS NOT NULL AND p.profession_specialization_id = p_profession_specialization_id)
      )
  )
  SELECT ranked.id, ranked.full_name, ranked.photo_url, ranked.position, ranked.company_name,
         ranked.total_points, ranked.chapter_id, ranked.c_name, ranked.c_city,
         ranked.s_name, ranked.rn
  FROM ranked
  WHERE ranked.rn = 1
  ORDER BY ranked.total_points DESC
  LIMIT 10;
END;
$$;
