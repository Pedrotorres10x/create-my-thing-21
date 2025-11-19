-- Create table for collaborative sphere projects
CREATE TABLE IF NOT EXISTS public.sphere_collaborative_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_sphere_id INTEGER NOT NULL REFERENCES public.business_spheres(id),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id),
  creator_id UUID NOT NULL REFERENCES public.professionals(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_specializations INTEGER[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for project participants
CREATE TABLE IF NOT EXISTS public.sphere_project_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.sphere_collaborative_projects(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id),
  profession_specialization_id INTEGER REFERENCES public.profession_specializations(id),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'confirmed', 'declined', 'completed')),
  contribution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, professional_id)
);

-- Enable RLS
ALTER TABLE public.sphere_collaborative_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sphere_project_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Approved users can view projects in their sphere"
  ON public.sphere_collaborative_projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.user_id = auth.uid()
        AND professionals.business_sphere_id = sphere_collaborative_projects.business_sphere_id
        AND professionals.status = 'approved'
    )
  );

CREATE POLICY "Approved users can create projects"
  ON public.sphere_collaborative_projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = creator_id
        AND professionals.user_id = auth.uid()
        AND professionals.status = 'approved'
    )
  );

CREATE POLICY "Creators can update their projects"
  ON public.sphere_collaborative_projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = creator_id
        AND professionals.user_id = auth.uid()
    )
  );

-- RLS Policies for participants
CREATE POLICY "Users can view participants in their sphere projects"
  ON public.sphere_project_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sphere_collaborative_projects scp
      JOIN professionals p ON p.user_id = auth.uid()
      WHERE scp.id = sphere_project_participants.project_id
        AND p.business_sphere_id = scp.business_sphere_id
        AND p.status = 'approved'
    )
  );

CREATE POLICY "Project creators can add participants"
  ON public.sphere_project_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sphere_collaborative_projects scp
      JOIN professionals p ON p.user_id = auth.uid()
      WHERE scp.id = project_id
        AND scp.creator_id = p.id
    )
  );

CREATE POLICY "Participants can update their own status"
  ON public.sphere_project_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM professionals
      WHERE professionals.id = sphere_project_participants.professional_id
        AND professionals.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_sphere_projects_sphere ON sphere_collaborative_projects(business_sphere_id);
CREATE INDEX idx_sphere_projects_chapter ON sphere_collaborative_projects(chapter_id);
CREATE INDEX idx_sphere_projects_status ON sphere_collaborative_projects(status);
CREATE INDEX idx_project_participants_project ON sphere_project_participants(project_id);
CREATE INDEX idx_project_participants_professional ON sphere_project_participants(professional_id);