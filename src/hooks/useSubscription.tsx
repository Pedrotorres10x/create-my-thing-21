import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  ai_messages_limit: number | null;
  chapter_access_level: string;
  features: any;
  display_order: number;
}

interface UserSubscription {
  plan: SubscriptionPlan;
  status: string;
  starts_at: string;
  ends_at: string | null;
  ai_messages_count: number;
  ai_messages_reset_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch available subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  // Fetch user's current subscription
  const { data: currentSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["user-subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: professional, error } = await supabase
        .from("professionals")
        .select(`
          subscription_status,
          subscription_starts_at,
          subscription_ends_at,
          ai_messages_count,
          ai_messages_reset_at,
          subscription_plans (*)
        `)
        .eq("user_id", user!.id)
        .single();

      if (error) throw error;

      return {
        plan: professional.subscription_plans,
        status: professional.subscription_status,
        starts_at: professional.subscription_starts_at,
        ends_at: professional.subscription_ends_at,
        ai_messages_count: professional.ai_messages_count,
        ai_messages_reset_at: professional.ai_messages_reset_at,
      } as UserSubscription;
    },
  });

  // Check if user can send AI messages
  const { data: canSendAIMessage } = useQuery({
    queryKey: ["can-send-ai-message", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!professional) return false;

      const { data, error } = await supabase.rpc("can_send_ai_message", {
        _professional_id: professional.id,
      });

      if (error) {
        console.error("Error checking AI message limit:", error);
        return false;
      }

      return data as boolean;
    },
    refetchInterval: 5000, // Check every 5 seconds
  });

  // Increment AI message count
  const incrementAIMessages = useMutation({
    mutationFn: async () => {
      const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!professional) throw new Error("Professional not found");

      const { error } = await supabase.rpc("increment_ai_messages", {
        _professional_id: professional.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["can-send-ai-message"] });
    },
  });

  // Check subscription access level
  const hasAccessLevel = (requiredLevel: string): boolean => {
    if (!currentSubscription?.plan) return false;

    const levels = ["local", "provincial", "regional", "national"];
    const userLevel = currentSubscription.plan.chapter_access_level;
    const userLevelIndex = levels.indexOf(userLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);

    return userLevelIndex >= requiredLevelIndex;
  };

  // Get AI messages remaining
  const getAIMessagesRemaining = (): number | null => {
    if (!currentSubscription) return null;

    const limit = currentSubscription.plan.ai_messages_limit;
    if (limit === null) return null; // Unlimited

    return Math.max(0, limit - currentSubscription.ai_messages_count);
  };

  return {
    plans,
    plansLoading,
    currentSubscription,
    subscriptionLoading,
    canSendAIMessage: canSendAIMessage ?? false,
    incrementAIMessages: incrementAIMessages.mutateAsync,
    hasAccessLevel,
    getAIMessagesRemaining,
  };
}
