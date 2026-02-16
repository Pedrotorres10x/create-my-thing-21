import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type ActionType = 'chat_message' | 'meeting_request' | 'deal_creation' | 'offer_contact';

interface RateLimitConfig {
  maxActions: number;
  windowMinutes: number;
}

const DEFAULT_LIMITS: Record<ActionType, RateLimitConfig> = {
  chat_message: { maxActions: 30, windowMinutes: 60 },
  meeting_request: { maxActions: 5, windowMinutes: 1440 }, // 5 per day
  deal_creation: { maxActions: 10, windowMinutes: 1440 }, // 10 per day
  offer_contact: { maxActions: 15, windowMinutes: 60 },
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export function useRateLimiter() {
  const [checking, setChecking] = useState(false);

  const checkRateLimit = async (
    professionalId: string,
    actionType: ActionType,
    content?: string
  ): Promise<boolean> => {
    setChecking(true);
    try {
      const config = DEFAULT_LIMITS[actionType];
      const contentHash = content ? simpleHash(content.trim().toLowerCase()) : null;

      const { data, error } = await supabase.rpc('check_rate_limit', {
        _professional_id: professionalId,
        _action_type: actionType,
        _max_actions: config.maxActions,
        _window_minutes: config.windowMinutes,
        _content_hash: contentHash,
      });

      if (error) {
        console.error('Rate limit check error:', error);
        return true; // Allow on error
      }

      const result = data as any;
      if (!result?.allowed) {
        toast({
          title: "⚠️ Límite alcanzado",
          description: result?.reason || "Demasiadas acciones. Espera un momento.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Rate limiter error:', error);
      return true; // Allow on error
    } finally {
      setChecking(false);
    }
  };

  return { checkRateLimit, checking };
}
