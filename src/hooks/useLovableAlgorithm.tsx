import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type EmotionalState =
  | "active_inspired"
  | "active_constant"
  | "active_at_risk"
  | "disconnected_light"
  | "disconnected_critical"
  | "returning"
  | "accelerated_growth"
  | "top_performer";

export interface EmotionalStateData {
  id: string;
  professional_id: string;
  emotional_state: EmotionalState;
  days_since_last_activity: number;
  activity_quality_score: number;
  energy_trend: "rising" | "stable" | "falling";
  snapshot_generated_at: string;
  state_changed_at: string;
}

export interface EmotionalMetrics {
  id: string;
  professional_id: string;
  emotional_bond_score: number;
  trust_index: number;
  retention_probability: number;
}

export interface MicroReward {
  id: string;
  professional_id: string;
  reward_type_id: string;
  status: "active" | "expired" | "claimed" | "revoked";
  granted_at: string;
  expires_at: string | null;
  reward_type?: {
    code: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    points_value: number;
  };
}

export interface LovableMessage {
  id: string;
  professional_id: string;
  message_type: string;
  title: string;
  content: string;
  tone: string;
  is_read: boolean;
  created_at: string;
}

const EMOTIONAL_STATE_LABELS: Record<EmotionalState, string> = {
  active_inspired: "Inspirado",
  active_constant: "Constante",
  active_at_risk: "En riesgo",
  disconnected_light: "Desconectado",
  disconnected_critical: "Crítico",
  returning: "Regresando",
  accelerated_growth: "En crecimiento",
  top_performer: "Top Performer",
};

const EMOTIONAL_STATE_COLORS: Record<EmotionalState, string> = {
  active_inspired: "text-yellow-500",
  active_constant: "text-green-500",
  active_at_risk: "text-orange-500",
  disconnected_light: "text-gray-500",
  disconnected_critical: "text-red-500",
  returning: "text-blue-500",
  accelerated_growth: "text-purple-500",
  top_performer: "text-amber-500",
};

export function useLovableAlgorithm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener el professional_id del usuario
  const { data: professional } = useQuery({
    queryKey: ["professional-for-lovable", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Obtener estado emocional actual
  const { data: emotionalState, isLoading: isLoadingState } = useQuery({
    queryKey: ["emotional-state", professional?.id],
    queryFn: async () => {
      if (!professional?.id) return null;
      
      const { data, error } = await supabase
        .from("user_emotional_states")
        .select("*")
        .eq("professional_id", professional.id)
        .maybeSingle();

      if (error) throw error;
      return data as EmotionalStateData | null;
    },
    enabled: !!professional?.id,
  });

  // Obtener métricas emocionales
  const { data: emotionalMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["emotional-metrics", professional?.id],
    queryFn: async () => {
      if (!professional?.id) return null;

      const { data, error } = await supabase
        .from("user_emotional_metrics")
        .select("*")
        .eq("professional_id", professional.id)
        .maybeSingle();

      if (error) throw error;
      return data as EmotionalMetrics | null;
    },
    enabled: !!professional?.id,
  });

  // Obtener micro-recompensas activas
  const { data: activeRewards, isLoading: isLoadingRewards } = useQuery({
    queryKey: ["active-rewards", professional?.id],
    queryFn: async () => {
      if (!professional?.id) return [];

      const { data, error } = await supabase
        .from("user_micro_rewards")
        .select(`
          *,
          reward_type:micro_reward_types(code, name, description, category, icon, points_value)
        `)
        .eq("professional_id", professional.id)
        .eq("status", "active")
        .order("granted_at", { ascending: false });

      if (error) throw error;
      return (data || []) as MicroReward[];
    },
    enabled: !!professional?.id,
  });

  // Obtener mensajes no leídos
  const { data: unreadMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["lovable-messages", professional?.id],
    queryFn: async () => {
      if (!professional?.id) return [];

      const { data, error } = await supabase
        .from("lovable_messages")
        .select("*")
        .eq("professional_id", professional.id)
        .eq("is_read", false)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as LovableMessage[];
    },
    enabled: !!professional?.id,
  });

  // Marcar mensaje como leído
  const markMessageAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("lovable_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lovable-messages"] });
    },
  });

  // Descartar mensaje
  const dismissMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("lovable_messages")
        .update({ is_dismissed: true })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lovable-messages"] });
    },
  });

  // Reclamar recompensa
  const claimReward = useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from("user_micro_rewards")
        .update({ status: "claimed", claimed_at: new Date().toISOString() })
        .eq("id", rewardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-rewards"] });
    },
  });

  // Helper para obtener label del estado
  const getStateLabel = (state: EmotionalState | undefined): string => {
    if (!state) return "Sin datos";
    return EMOTIONAL_STATE_LABELS[state] || state;
  };

  // Helper para obtener color del estado
  const getStateColor = (state: EmotionalState | undefined): string => {
    if (!state) return "text-muted-foreground";
    return EMOTIONAL_STATE_COLORS[state] || "text-muted-foreground";
  };

  return {
    // Data
    emotionalState,
    emotionalMetrics,
    activeRewards,
    unreadMessages,
    
    // Loading states
    isLoading: isLoadingState || isLoadingMetrics || isLoadingRewards || isLoadingMessages,
    isLoadingState,
    isLoadingMetrics,
    isLoadingRewards,
    isLoadingMessages,

    // Mutations
    markMessageAsRead,
    dismissMessage,
    claimReward,

    // Helpers
    getStateLabel,
    getStateColor,

    // Constants
    EMOTIONAL_STATE_LABELS,
    EMOTIONAL_STATE_COLORS,
  };
}
