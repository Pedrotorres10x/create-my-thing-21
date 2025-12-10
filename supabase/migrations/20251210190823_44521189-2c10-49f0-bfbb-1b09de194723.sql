-- =====================================================
-- LOVABLE ALGORITHM - SISTEMA DE ESTADOS EMOCIONALES
-- =====================================================

-- 1. Tabla de estados emocionales de usuario
CREATE TABLE public.user_emotional_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  
  -- Estado emocional operativo
  emotional_state TEXT NOT NULL DEFAULT 'active_constant' CHECK (
    emotional_state IN (
      'active_inspired',      -- AI: Activo Inspirado
      'active_constant',      -- AC: Activo Constante
      'active_at_risk',       -- AR: Activo en Riesgo
      'disconnected_light',   -- DL: Desconectado Ligero
      'disconnected_critical', -- DC: Desconectado Crítico
      'returning',            -- RG: Regresando
      'accelerated_growth',   -- CA: Crecimiento Acelerado
      'top_performer'         -- TP: Top Performer
    )
  ),
  
  -- Snapshot de comportamiento
  last_activity_timestamp TIMESTAMP WITH TIME ZONE,
  days_since_last_activity INTEGER DEFAULT 0,
  activity_quality_score INTEGER DEFAULT 50 CHECK (activity_quality_score >= 0 AND activity_quality_score <= 100),
  energy_trend TEXT DEFAULT 'stable' CHECK (energy_trend IN ('rising', 'stable', 'falling')),
  effort_signals JSONB DEFAULT '{}',
  
  -- Contadores de actividad (últimas 24h)
  referrals_count_24h INTEGER DEFAULT 0,
  messages_count_24h INTEGER DEFAULT 0,
  marketplace_actions_24h INTEGER DEFAULT 0,
  meetings_count_24h INTEGER DEFAULT 0,
  
  -- Metadatos
  snapshot_generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  state_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  previous_state TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_professional_emotional_state UNIQUE (professional_id)
);

-- 2. Tabla de métricas emocionales
CREATE TABLE public.user_emotional_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  
  -- Métricas principales
  emotional_bond_score INTEGER DEFAULT 50 CHECK (emotional_bond_score >= 0 AND emotional_bond_score <= 100),
  trust_index INTEGER DEFAULT 50 CHECK (trust_index >= 0 AND trust_index <= 100),
  retention_probability INTEGER DEFAULT 50 CHECK (retention_probability >= 0 AND retention_probability <= 100),
  
  -- Historial de cambios
  ebs_history JSONB DEFAULT '[]',
  trust_history JSONB DEFAULT '[]',
  retention_history JSONB DEFAULT '[]',
  
  -- Preferencias aprendidas
  preferred_reward_types JSONB DEFAULT '[]',
  effective_message_tones JSONB DEFAULT '[]',
  natural_activity_rhythm JSONB DEFAULT '{}',
  abandonment_sensitivity INTEGER DEFAULT 50,
  referral_response_rate INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_professional_metrics UNIQUE (professional_id)
);

-- 3. Catálogo de micro-recompensas
CREATE TABLE public.micro_reward_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('visibility', 'badge', 'priority', 'access', 'recognition', 'boost')),
  icon TEXT,
  points_value INTEGER DEFAULT 0,
  duration_hours INTEGER, -- NULL = permanente
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Recompensas otorgadas a usuarios
CREATE TABLE public.user_micro_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  reward_type_id UUID NOT NULL REFERENCES public.micro_reward_types(id),
  
  -- Estado de la recompensa
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed', 'revoked')),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  
  -- Contexto
  trigger_action TEXT, -- Qué acción disparó la recompensa
  trigger_state TEXT, -- Estado emocional cuando se otorgó
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Log de interacciones LOVABLE
CREATE TABLE public.lovable_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  
  -- Tipo de interacción
  interaction_type TEXT NOT NULL CHECK (
    interaction_type IN (
      'state_classification',
      'message_sent',
      'reward_granted',
      'metric_update',
      'intervention'
    )
  ),
  
  -- Detalles
  emotional_state_before TEXT,
  emotional_state_after TEXT,
  action_taken TEXT,
  message_content TEXT,
  reward_id UUID REFERENCES public.user_micro_rewards(id),
  
  -- Resultado
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'pending')),
  user_response JSONB DEFAULT '{}',
  
  -- Impacto en métricas
  ebs_change INTEGER DEFAULT 0,
  trust_change INTEGER DEFAULT 0,
  retention_change INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Mensajes personalizados del algoritmo
CREATE TABLE public.lovable_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  
  -- Contenido
  message_type TEXT NOT NULL CHECK (message_type IN ('celebration', 'support', 'reminder', 'welcome', 'recognition')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tone TEXT DEFAULT 'warm' CHECK (tone IN ('warm', 'professional', 'encouraging', 'celebratory')),
  
  -- Estado
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  is_dismissed BOOLEAN DEFAULT false,
  
  -- Contexto
  trigger_state TEXT,
  trigger_action TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_emotional_states_professional ON public.user_emotional_states(professional_id);
CREATE INDEX idx_emotional_states_state ON public.user_emotional_states(emotional_state);
CREATE INDEX idx_emotional_states_snapshot ON public.user_emotional_states(snapshot_generated_at);

CREATE INDEX idx_emotional_metrics_professional ON public.user_emotional_metrics(professional_id);
CREATE INDEX idx_emotional_metrics_ebs ON public.user_emotional_metrics(emotional_bond_score);

CREATE INDEX idx_micro_rewards_professional ON public.user_micro_rewards(professional_id);
CREATE INDEX idx_micro_rewards_status ON public.user_micro_rewards(status);
CREATE INDEX idx_micro_rewards_expires ON public.user_micro_rewards(expires_at);

CREATE INDEX idx_lovable_interactions_professional ON public.lovable_interactions(professional_id);
CREATE INDEX idx_lovable_interactions_type ON public.lovable_interactions(interaction_type);
CREATE INDEX idx_lovable_interactions_created ON public.lovable_interactions(created_at);

CREATE INDEX idx_lovable_messages_professional ON public.lovable_messages(professional_id);
CREATE INDEX idx_lovable_messages_unread ON public.lovable_messages(professional_id, is_read) WHERE is_read = false;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.user_emotional_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_emotional_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_reward_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_micro_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lovable_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lovable_messages ENABLE ROW LEVEL SECURITY;

-- User Emotional States - usuarios ven solo sus propios datos
CREATE POLICY "Users can view own emotional state"
  ON public.user_emotional_states FOR SELECT
  USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all emotional states"
  ON public.user_emotional_states FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage emotional states"
  ON public.user_emotional_states FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- User Emotional Metrics
CREATE POLICY "Users can view own metrics"
  ON public.user_emotional_metrics FOR SELECT
  USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage metrics"
  ON public.user_emotional_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Micro Reward Types - públicos para lectura
CREATE POLICY "Anyone can view reward types"
  ON public.micro_reward_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage reward types"
  ON public.micro_reward_types FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- User Micro Rewards
CREATE POLICY "Users can view own rewards"
  ON public.user_micro_rewards FOR SELECT
  USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage rewards"
  ON public.user_micro_rewards FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Lovable Interactions - solo admins
CREATE POLICY "Admins can view interactions"
  ON public.lovable_interactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage interactions"
  ON public.lovable_interactions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Lovable Messages
CREATE POLICY "Users can view own messages"
  ON public.lovable_messages FOR SELECT
  USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own messages"
  ON public.lovable_messages FOR UPDATE
  USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage messages"
  ON public.lovable_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_emotional_states_updated_at
  BEFORE UPDATE ON public.user_emotional_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emotional_metrics_updated_at
  BEFORE UPDATE ON public.user_emotional_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATOS INICIALES - Tipos de micro-recompensas
-- =====================================================

INSERT INTO public.micro_reward_types (code, name, description, category, icon, points_value, duration_hours) VALUES
  ('visibility_boost', 'Visibilidad Temporal', 'Tu perfil aparece destacado en búsquedas', 'visibility', 'eye', 0, 24),
  ('hidden_badge_achiever', 'Badge Oculto: Achiever', 'Badge especial por constancia', 'badge', 'award', 50, NULL),
  ('hidden_badge_helper', 'Badge Oculto: Helper', 'Badge por ayudar a otros miembros', 'badge', 'heart-handshake', 50, NULL),
  ('priority_recommendations', 'Prioridad en Recomendaciones', 'Apareces primero en sugerencias de contacto', 'priority', 'star', 0, 48),
  ('early_access_feature', 'Acceso Anticipado', 'Prueba nuevas funciones antes que nadie', 'access', 'key', 0, 168),
  ('public_recognition', 'Reconocimiento Público', 'Mencionado en el feed de la comunidad', 'recognition', 'megaphone', 25, NULL),
  ('daily_boost', 'Boost Sorpresa del Día', 'Multiplicador de puntos x2 durante 24h', 'boost', 'zap', 0, 24),
  ('welcome_back_bonus', 'Bonus de Bienvenida', 'Puntos extra por regresar a la plataforma', 'boost', 'gift', 100, NULL),
  ('streak_protector', 'Protector de Racha', 'No pierdes tu racha de actividad por 1 día', 'boost', 'shield', 0, 24),
  ('contact_suggestion', 'Sugerencia de Contacto', 'Recibe una recomendación personalizada de networking', 'priority', 'users', 0, NULL);

-- =====================================================
-- FUNCIONES DEL ALGORITMO
-- =====================================================

-- Función para clasificar el estado emocional
CREATE OR REPLACE FUNCTION public.classify_emotional_state(
  _days_inactive INTEGER,
  _activity_score INTEGER,
  _energy_trend TEXT,
  _recent_achievements INTEGER,
  _total_points INTEGER,
  _previous_state TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Top Performer: puntos altos + actividad constante
  IF _total_points >= 500 AND _activity_score >= 80 AND _days_inactive <= 3 THEN
    RETURN 'top_performer';
  END IF;
  
  -- Crecimiento Acelerado: mejora rápida
  IF _energy_trend = 'rising' AND _activity_score >= 60 AND _recent_achievements >= 2 THEN
    RETURN 'accelerated_growth';
  END IF;
  
  -- Regresando: volvió después de inactividad
  IF _previous_state IN ('disconnected_light', 'disconnected_critical') AND _days_inactive <= 7 THEN
    RETURN 'returning';
  END IF;
  
  -- Activo Inspirado: alta actividad + logros recientes
  IF _activity_score >= 70 AND _days_inactive <= 3 AND _recent_achievements >= 1 THEN
    RETURN 'active_inspired';
  END IF;
  
  -- Activo Constante: actividad normal
  IF _activity_score >= 40 AND _days_inactive <= 7 THEN
    RETURN 'active_constant';
  END IF;
  
  -- Activo en Riesgo: señales de bajada
  IF _activity_score >= 20 AND _days_inactive BETWEEN 7 AND 14 THEN
    RETURN 'active_at_risk';
  END IF;
  
  -- Desconectado Ligero
  IF _days_inactive BETWEEN 14 AND 30 THEN
    RETURN 'disconnected_light';
  END IF;
  
  -- Desconectado Crítico
  RETURN 'disconnected_critical';
END;
$$;

-- Función para seleccionar la acción LOVABLE según estado
CREATE OR REPLACE FUNCTION public.get_lovable_action(_emotional_state TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN CASE _emotional_state
    WHEN 'active_inspired' THEN 
      '{"action": "celebration_and_impulse", "message_type": "celebration", "reward_category": "recognition", "tone": "celebratory"}'::JSONB
    WHEN 'active_constant' THEN 
      '{"action": "silent_recognition", "message_type": "recognition", "reward_category": "priority", "tone": "professional"}'::JSONB
    WHEN 'active_at_risk' THEN 
      '{"action": "support_and_suggestion", "message_type": "support", "reward_category": "boost", "tone": "encouraging"}'::JSONB
    WHEN 'disconnected_light' THEN 
      '{"action": "soft_reminder", "message_type": "reminder", "reward_category": "visibility", "tone": "warm"}'::JSONB
    WHEN 'disconnected_critical' THEN 
      '{"action": "individual_intervention", "message_type": "support", "reward_category": "boost", "tone": "warm"}'::JSONB
    WHEN 'returning' THEN 
      '{"action": "warm_welcome", "message_type": "welcome", "reward_category": "boost", "tone": "celebratory"}'::JSONB
    WHEN 'accelerated_growth' THEN 
      '{"action": "surprise_and_reinforce", "message_type": "celebration", "reward_category": "badge", "tone": "celebratory"}'::JSONB
    WHEN 'top_performer' THEN 
      '{"action": "public_highlight", "message_type": "recognition", "reward_category": "recognition", "tone": "professional"}'::JSONB
    ELSE 
      '{"action": "observe", "message_type": null, "reward_category": null, "tone": "warm"}'::JSONB
  END;
END;
$$;