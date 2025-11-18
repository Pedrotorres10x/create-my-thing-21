import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, ShieldAlert, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { CreateAppealDialog } from "@/components/appeals/CreateAppealDialog";

interface Penalty {
  id: string;
  penalty_type: string;
  severity: string;
  reason: string;
  points_deducted: number;
  restriction_until: string | null;
  created_at: string;
  is_active: boolean;
  hasAppeal?: boolean;
}

interface UserPenaltiesAlertProps {
  professionalId: string;
}

export function UserPenaltiesAlert({ professionalId }: UserPenaltiesAlertProps) {
  const [activePenalties, setActivePenalties] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [appealDialogOpen, setAppealDialogOpen] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<Penalty | null>(null);

  useEffect(() => {
    fetchActivePenalties();
  }, [professionalId]);

  const fetchActivePenalties = async () => {
    try {
      // Fetch penalties with appeal info
      const { data: penalties, error: penaltiesError } = await supabase
        .from("user_penalties")
        .select("*")
        .eq("professional_id", professionalId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (penaltiesError) throw penaltiesError;

      // Check which penalties already have appeals
      const { data: appeals, error: appealsError } = await supabase
        .from("penalty_appeals")
        .select("penalty_id")
        .eq("professional_id", professionalId);

      if (appealsError) throw appealsError;

      const appealedPenaltyIds = new Set(appeals?.map(a => a.penalty_id) || []);
      
      const penaltiesWithAppealInfo = (penalties || []).map(p => ({
        ...p,
        hasAppeal: appealedPenaltyIds.has(p.id),
      }));

      setActivePenalties(penaltiesWithAppealInfo);
    } catch (error) {
      console.error("Error fetching penalties:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppealClick = (penalty: Penalty) => {
    setSelectedPenalty(penalty);
    setAppealDialogOpen(true);
  };

  if (loading || activePenalties.length === 0) return null;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <ShieldAlert className="h-5 w-5" />;
      case "high":
        return <XCircle className="h-5 w-5" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getSeverityVariant = (severity: string): "default" | "destructive" => {
    return severity === "critical" || severity === "high" ? "destructive" : "default";
  };

  return (
    <>
      <div className="space-y-3">
        {activePenalties.map((penalty) => (
          <Alert key={penalty.id} variant={getSeverityVariant(penalty.severity)}>
            {getSeverityIcon(penalty.severity)}
            <AlertTitle className="font-semibold">
              {penalty.penalty_type === "permanent_ban" && "⛔ Cuenta Bloqueada"}
              {penalty.penalty_type === "temporary_restriction" && "⚠️ Restricción Temporal"}
              {penalty.penalty_type === "points_deduction" && "📉 Deducción de Puntos"}
              {penalty.penalty_type === "warning" && "⚡ Advertencia"}
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{penalty.reason}</p>
              {penalty.points_deducted > 0 && (
                <p className="text-sm">
                  <strong>Puntos deducidos:</strong> {penalty.points_deducted}
                </p>
              )}
              {penalty.restriction_until && (
                <p className="text-sm">
                  <strong>Restricción hasta:</strong>{" "}
                  {format(new Date(penalty.restriction_until), "PPP 'a las' p", { locale: es })}
                </p>
              )}
              <p className="text-xs opacity-80">
                {format(new Date(penalty.created_at), "PPP", { locale: es })}
              </p>
              {!penalty.hasAppeal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAppealClick(penalty)}
                  className="mt-2"
                >
                  Apelar sanción
                </Button>
              )}
              {penalty.hasAppeal && (
                <p className="text-xs text-muted-foreground mt-2">
                  ✓ Apelación enviada - En revisión
                </p>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </div>

      {selectedPenalty && (
        <CreateAppealDialog
          open={appealDialogOpen}
          onOpenChange={setAppealDialogOpen}
          penaltyId={selectedPenalty.id}
          professionalId={professionalId}
          penaltyReason={selectedPenalty.reason}
          onSuccess={fetchActivePenalties}
        />
      )}
    </>
  );
}
