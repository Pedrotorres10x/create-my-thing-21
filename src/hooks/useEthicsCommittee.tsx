import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface EthicsCommitteeMember {
  id: string;
  full_name: string;
  email: string;
  total_points: number;
  photo_url: string | null;
}

interface EthicsReport {
  id: string;
  report_type: string;
  description: string;
  status: string;
  context: string | null;
  created_at: string;
  reporter_id: string;
  reported_id: string;
  ethics_committee_resolution: string | null;
  escalated_to_admin: boolean;
  reporter: {
    full_name: string;
    email: string;
  };
  reported: {
    full_name: string;
    email: string;
  };
}

export function useEthicsCommittee() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener el professional_id del usuario actual
  const { data: professionalId } = useQuery({
    queryKey: ["professional-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data?.id || null;
    },
    enabled: !!user?.id,
  });

  // Verificar si el usuario actual es miembro del comité
  const { data: isCommitteeMember = false, isLoading: checkingMembership } = useQuery({
    queryKey: ["ethics-committee-member", professionalId],
    queryFn: async () => {
      if (!professionalId) return false;
      
      const { data, error } = await supabase.rpc("is_ethics_committee_member", {
        _professional_id: professionalId,
      });

      if (error) throw error;
      return data || false;
    },
    enabled: !!professionalId,
  });

  // Obtener miembros del comité
  const { data: committeeMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["ethics-committee-members"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ethics_committee_members");
      if (error) throw error;
      return (data || []) as EthicsCommitteeMember[];
    },
  });

  // Obtener reportes pendientes para el comité
  const { data: pendingReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["ethics-committee-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reports")
        .select(`
          *,
          reporter:professionals!user_reports_reporter_id_fkey(full_name, email),
          reported:professionals!user_reports_reported_id_fkey(full_name, email)
        `)
        .in("status", ["pending", "under_ethics_review"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as EthicsReport[];
    },
    enabled: isCommitteeMember,
  });

  // Resolver un reporte
  const resolveReport = useMutation({
    mutationFn: async ({
      reportId,
      decision,
      resolutionNotes,
    }: {
      reportId: string;
      decision: "resolved" | "escalate" | "dismiss";
      resolutionNotes: string;
    }) => {
      if (!professionalId) throw new Error("No professional ID");

      // Registrar la decisión del comité
      const { error: decisionError } = await supabase
        .from("ethics_committee_decisions")
        .insert({
          report_id: reportId,
          reviewed_by: professionalId,
          decision,
          resolution_notes: resolutionNotes,
        });

      if (decisionError) throw decisionError;

      // Actualizar el estado del reporte
      const updateData: any = {
        ethics_committee_reviewed_by: professionalId,
        ethics_committee_reviewed_at: new Date().toISOString(),
        ethics_committee_resolution: resolutionNotes,
      };

      if (decision === "resolved") {
        updateData.status = "resolved_by_ethics";
      } else if (decision === "escalate") {
        updateData.status = "escalated";
        updateData.escalated_to_admin = true;
        updateData.escalation_reason = resolutionNotes;
      } else if (decision === "dismiss") {
        updateData.status = "dismissed";
      }

      const { error: updateError } = await supabase
        .from("user_reports")
        .update(updateData)
        .eq("id", reportId);

      if (updateError) throw updateError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ethics-committee-reports"] });
      
      const actionText = variables.decision === "resolved" 
        ? "resuelto" 
        : variables.decision === "escalate" 
        ? "escalado al administrador" 
        : "desestimado";
      
      toast.success(`Reporte ${actionText} exitosamente`);
    },
    onError: (error: any) => {
      console.error("Error resolving report:", error);
      toast.error("Error al procesar el reporte");
    },
  });

  return {
    isCommitteeMember,
    checkingMembership,
    committeeMembers,
    loadingMembers,
    pendingReports,
    loadingReports,
    resolveReport: resolveReport.mutate,
    resolvingReport: resolveReport.isPending,
  };
}
