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

      // Update activity tracking in real-time
      await updateActivityTracking(professionalId, eventType);
    } catch (error) {
      console.error('Error in behavior tracking:', error);
    }
  };

  const updateActivityTracking = async (professionalId: string, eventType: BehaviorEventType) => {
    try {
      const now = new Date().toISOString();
      const updates: Record<string, string> = {};

      // Map event types to last activity fields
      switch(eventType) {
        case 'offer_view':
        case 'offer_contact':
          updates.last_offer_contact = now;
          break;
        case 'message_sent':
          updates.last_comment = now;
          break;
        case 'profile_view':
          updates.last_login = now;
          break;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('user_activity_tracking')
          .update(updates)
          .eq('professional_id', professionalId);

        if (error) {
          console.error('Error updating activity tracking:', error);
        }
      }
    } catch (error) {
      console.error('Error in updateActivityTracking:', error);
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

  const getActivityTracking = async (professionalId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_activity_tracking')
        .select('*')
        .eq('professional_id', professionalId)
        .single();

      if (error) {
        console.error('Error fetching activity tracking:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getActivityTracking:', error);
      return null;
    }
  };

  return {
    trackEvent,
    analyzeBehavior,
    getActivityTracking,
    updateActivityTracking,
  };
}
