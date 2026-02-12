
-- Table: badges (catalog of all available badges)
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL DEFAULT 'engagement',
  unlock_condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (true);

-- Table: professional_badges (unlocked badges per user)
CREATE TABLE public.professional_badges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(professional_id, badge_id)
);

ALTER TABLE public.professional_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view professional badges"
  ON public.professional_badges FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert badges"
  ON public.professional_badges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Table: cross_chapter_requests
CREATE TABLE public.cross_chapter_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  requested_specialization_id integer REFERENCES public.specializations(id),
  requested_profession_specialization_id integer REFERENCES public.profession_specializations(id),
  description text,
  status text NOT NULL DEFAULT 'open',
  matched_professional_id uuid REFERENCES public.professionals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cross_chapter_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cross chapter requests"
  ON public.cross_chapter_requests FOR SELECT
  USING (requester_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create cross chapter requests"
  ON public.cross_chapter_requests FOR INSERT
  WITH CHECK (requester_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own requests"
  ON public.cross_chapter_requests FOR UPDATE
  USING (requester_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ));

-- Seed the 10 badges
INSERT INTO public.badges (code, name, description, icon, category, unlock_condition) VALUES
('first_referral', 'Primer Referido', 'Completar tu primer referido exitoso', 'star', 'networking', '{"type": "referrals", "count": 1}'),
('networker', 'Networker', '5 reuniones Cara a Cara completadas', 'handshake', 'networking', '{"type": "meetings", "count": 5}'),
('conector_nato', 'Conector Nato', '10 referidos completados', 'network', 'networking', '{"type": "referrals", "count": 10}'),
('cerrador', 'Cerrador', 'Cerrar 5 deals', 'lock', 'deals', '{"type": "deals", "count": 5}'),
('veterano', 'Veterano', '6 meses activo sin interrupciones', 'shield', 'engagement', '{"type": "active_months", "count": 6}'),
('top_10', 'Top 10', 'Estar en el Top 10 del ranking general', 'medal', 'prestige', '{"type": "ranking", "position": 10}'),
('el_consejo', 'El Consejo', 'Ser miembro del Consejo de Sabios', 'crown', 'prestige', '{"type": "council_member"}'),
('diamante', 'Diamante', 'Alcanzar nivel Diamante', 'diamond', 'prestige', '{"type": "level", "name": "Diamante"}'),
('mentor', 'Mentor', 'Invitar a 5 profesionales que se aprueben', 'book-open', 'engagement', '{"type": "approved_invites", "count": 5}'),
('deal_maker', 'Deal Maker', 'Superar 10.000 EUR en deals cerrados', 'coins', 'deals', '{"type": "deal_value", "amount": 10000}');
