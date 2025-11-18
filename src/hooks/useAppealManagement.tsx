import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CreateAppealData {
  penaltyId: string;
  professionalId: string;
  appealReason: string;
  additionalContext?: string;
}

interface UpdateAppealData {
  appealId: string;
  status: 'under_review' | 'approved' | 'rejected';
  adminResponse: string;
  reviewedBy: string;
}

export function useAppealManagement() {
  const [loading, setLoading] = useState(false);

  const createAppeal = async (data: CreateAppealData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('penalty_appeals')
        .insert({
          penalty_id: data.penaltyId,
          professional_id: data.professionalId,
          appeal_reason: data.appealReason,
          additional_context: data.additionalContext,
        });

      if (error) throw error;

      toast({
        title: "✅ Apelación enviada",
        description: "Tu apelación ha sido enviada y será revisada por el equipo de administración.",
      });

      return true;
    } catch (error) {
      console.error('Error creating appeal:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo enviar la apelación. Inténtalo de nuevo.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateAppeal = async (data: UpdateAppealData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('penalty_appeals')
        .update({
          status: data.status,
          admin_response: data.adminResponse,
          reviewed_by: data.reviewedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', data.appealId);

      if (error) throw error;

      // Si la apelación fue aprobada, desactivar la penalización
      if (data.status === 'approved') {
        const { data: appealData } = await supabase
          .from('penalty_appeals')
          .select('penalty_id')
          .eq('id', data.appealId)
          .single();

        if (appealData) {
          await supabase
            .from('user_penalties')
            .update({ is_active: false })
            .eq('id', appealData.penalty_id);
        }
      }

      toast({
        title: "✅ Apelación actualizada",
        description: `La apelación ha sido ${data.status === 'approved' ? 'aprobada' : 'rechazada'}.`,
      });

      return true;
    } catch (error) {
      console.error('Error updating appeal:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar la apelación.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createAppeal,
    updateAppeal,
  };
}
