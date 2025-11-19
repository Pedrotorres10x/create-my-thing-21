-- Create table for sphere internal references
CREATE TABLE IF NOT EXISTS public.sphere_internal_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.professionals(id),
  referred_to_id UUID NOT NULL REFERENCES public.professionals(id),
  business_sphere_id INTEGER NOT NULL REFERENCES public.business_spheres(id),
  client_name TEXT NOT NULL,
  service_needed TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined')),
  points_awarded INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (referrer_id != referred_to_id)
);

-- Enable RLS
ALTER TABLE public.sphere_internal_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view references they're involved in"
  ON public.sphere_internal_references
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.user_id = auth.uid()
        AND (professionals.id = sphere_internal_references.referrer_id 
             OR professionals.id = sphere_internal_references.referred_to_id)
    )
  );

CREATE POLICY "Users can create references within their sphere"
  ON public.sphere_internal_references
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = referrer_id
        AND professionals.user_id = auth.uid()
        AND professionals.business_sphere_id = sphere_internal_references.business_sphere_id
        AND professionals.status = 'approved'
    )
  );

CREATE POLICY "Participants can update reference status"
  ON public.sphere_internal_references
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.user_id = auth.uid()
        AND (professionals.id = sphere_internal_references.referrer_id 
             OR professionals.id = sphere_internal_references.referred_to_id)
    )
  );

-- Create function to calculate sphere synergy score
CREATE OR REPLACE FUNCTION calculate_sphere_synergy_score(_professional_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score INTEGER := 0;
  sphere_id INTEGER;
  meetings_count INTEGER;
  references_sent INTEGER;
  references_received INTEGER;
  posts_count INTEGER;
  projects_count INTEGER;
BEGIN
  -- Get professional's sphere
  SELECT business_sphere_id INTO sphere_id
  FROM professionals
  WHERE id = _professional_id;
  
  IF sphere_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Count meetings with sphere members (last 30 days)
  SELECT COUNT(*) INTO meetings_count
  FROM meetings m
  WHERE (m.requester_id = _professional_id OR m.recipient_id = _professional_id)
    AND m.status IN ('confirmed', 'completed')
    AND m.created_at > now() - interval '30 days'
    AND (
      (m.requester_id = _professional_id AND EXISTS (
        SELECT 1 FROM professionals p WHERE p.id = m.recipient_id AND p.business_sphere_id = sphere_id
      ))
      OR
      (m.recipient_id = _professional_id AND EXISTS (
        SELECT 1 FROM professionals p WHERE p.id = m.requester_id AND p.business_sphere_id = sphere_id
      ))
    );
  
  -- Count sphere references sent (last 30 days)
  SELECT COUNT(*) INTO references_sent
  FROM sphere_internal_references
  WHERE referrer_id = _professional_id
    AND created_at > now() - interval '30 days';
  
  -- Count sphere references received (last 30 days)
  SELECT COUNT(*) INTO references_received
  FROM sphere_internal_references
  WHERE referred_to_id = _professional_id
    AND created_at > now() - interval '30 days';
  
  -- Count posts read from sphere (using post_likes as proxy, last 30 days)
  SELECT COUNT(DISTINCT pl.post_id) INTO posts_count
  FROM post_likes pl
  JOIN posts p ON p.id = pl.post_id
  JOIN professionals prof ON prof.id = p.professional_id
  WHERE pl.professional_id = _professional_id
    AND prof.business_sphere_id = sphere_id
    AND pl.created_at > now() - interval '30 days';
  
  -- Count active project participations
  SELECT COUNT(*) INTO projects_count
  FROM sphere_project_participants spp
  JOIN sphere_collaborative_projects scp ON scp.id = spp.project_id
  WHERE spp.professional_id = _professional_id
    AND spp.status = 'confirmed'
    AND scp.status = 'active';
  
  -- Calculate score
  score := (meetings_count * 50) + 
           (references_sent * 30) + 
           (references_received * 20) + 
           (posts_count * 3) + 
           (projects_count * 100);
  
  RETURN GREATEST(0, LEAST(score, 100)); -- Cap at 100
END;
$$;

-- Create indexes
CREATE INDEX idx_sphere_references_referrer ON sphere_internal_references(referrer_id);
CREATE INDEX idx_sphere_references_referred ON sphere_internal_references(referred_to_id);
CREATE INDEX idx_sphere_references_sphere ON sphere_internal_references(business_sphere_id);
CREATE INDEX idx_sphere_references_status ON sphere_internal_references(status);