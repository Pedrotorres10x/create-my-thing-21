import { supabase } from "@/integrations/supabase/client";

type BehaviorEventType = 
  | 'offer_view'
  | 'offer_contact'
  | 'message_sent'
  | 'profile_view'
  | 'contact_info_shared'
  | 'price_discussed'
  | 'rapid_messaging'
  | 'external_link_shared';

interface TrackEventParams {
  professionalId: string;
  eventType: BehaviorEventType;
  contextId?: string;
  metadata?: Record<string, any>;
  riskScore?: number;
}

export function useBehaviorTracking() {
  const trackEvent = async ({
    professionalId,
    eventType,
    contextId,
    metadata = {},
    riskScore = 0,
  }: TrackEventParams) => {
    try {
      const { error } = await supabase
        .from('user_behavior_events')
        .insert({
          professional_id: professionalId,
          event_type: eventType,
          context_id: contextId,
          metadata,
          risk_score: riskScore,
        });

      if (error) {
        console.error('Error tracking behavior event:', error);
      }
    } catch (error) {
      console.error('Error in behavior tracking:', error);
    }
  };

  const analyzeBehavior = async (professionalId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-behavior', {
        body: { professionalId },
      });

      if (error) {
        console.error('Error analyzing behavior:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in behavior analysis:', error);
      return null;
    }
  };

  return {
    trackEvent,
    analyzeBehavior,
  };
}
