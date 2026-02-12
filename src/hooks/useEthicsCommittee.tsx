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

interface ExpulsionReview {
  id: string;
  professional_id: string;
  trigger_type: string;
  trigger_details: any;
  status: string;
  votes_for_expulsion: number;
  votes_against: number;
  votes_extend: number;
  decided_at: string | null;
  auto_expire_at: string;
  created_at: string;
  professional: {
    full_name: string;
    email: string;
    expulsion_count: number;
  };
}

interface ExpulsionVote {
  id: string;
  review_id: string;
  voter_id: string;
  vote: string;
  reasoning: string;
  created_at: string;
}

export function useEthicsCommittee() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: committeeMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["ethics-committee-members"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ethics_committee_members");
      if (error) throw error;
      return (data || []) as EthicsCommitteeMember[];
    },
  });

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

  // Expulsion reviews
  const { data: expulsionReviews = [], isLoading: loadingExpulsions } = useQuery({
    queryKey: ["expulsion-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expulsion_reviews")
        .select(`
          *,
          professional:professionals!expulsion_reviews_professional_id_fkey(full_name, email, expulsion_count)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ExpulsionReview[];
    },
    enabled: isCommitteeMember,
  });

  // Votes for current reviews
  const { data: expulsionVotes = [] } = useQuery({
    queryKey: ["expulsion-votes"],
    queryFn: async () => {
      const reviewIds = expulsionReviews.map(r => r.id);
      if (reviewIds.length === 0) return [];
      const { data, error } = await supabase
        .from("expulsion_votes")
        .select("*")
        .in("review_id", reviewIds);
      if (error) throw error;
      return (data || []) as ExpulsionVote[];
    },
    enabled: isCommitteeMember && expulsionReviews.length > 0,
  });

  // Reentry requests
  const { data: reentryRequests = [], isLoading: loadingReentries } = useQuery({
    queryKey: ["reentry-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reentry_requests")
        .select(`
          *,
          professional:professionals!reentry_requests_professional_id_fkey(full_name, email, expulsion_count, last_expulsion_at)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isCommitteeMember,
  });

  // Cast expulsion vote
  const castVote = useMutation({
    mutationFn: async ({
      reviewId,
      vote,
      reasoning,
    }: {
      reviewId: string;
      vote: "expel" | "absolve" | "extend";
      reasoning: string;
    }) => {
      if (!professionalId) throw new Error("No professional ID");
      const { data, error } = await supabase.rpc("cast_expulsion_vote", {
        _review_id: reviewId,
        _voter_id: professionalId,
        _vote: vote,
        _reasoning: reasoning,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["expulsion-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["expulsion-votes"] });
      if (data?.decision) {
        const decisionText = data.decision === "approved"
          ? "Expulsión aprobada"
          : data.decision === "rejected"
          ? "Usuario absuelto"
          : "Prórroga concedida";
        toast.success(`Voto registrado. Decisión: ${decisionText}`);
      } else {
        toast.success("Voto registrado. Esperando más votos.");
      }
    },
    onError: (error: any) => {
      console.error("Error casting vote:", error);
      if (error.message?.includes("duplicate")) {
        toast.error("Ya has votado en este caso");
      } else {
        toast.error("Error al registrar el voto");
      }
    },
  });

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
      const { error: decisionError } = await supabase
        .from("ethics_committee_decisions")
        .insert({
          report_id: reportId,
          reviewed_by: professionalId,
          decision,
          resolution_notes: resolutionNotes,
        });
      if (decisionError) throw decisionError;

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
    professionalId,
    isCommitteeMember,
    checkingMembership,
    committeeMembers,
    loadingMembers,
    pendingReports,
    loadingReports,
    resolveReport: resolveReport.mutate,
    resolvingReport: resolveReport.isPending,
    expulsionReviews,
    loadingExpulsions,
    expulsionVotes,
    castVote: castVote.mutate,
    castingVote: castVote.isPending,
    reentryRequests,
    loadingReentries,
  };
}
