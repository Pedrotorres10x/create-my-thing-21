import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, ShieldAlert, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Penalty {
  id: string;
  penalty_type: string;
  severity: string;
  reason: string;
  points_deducted: number;
  restriction_until: string | null;
  created_at: string;
  is_active: boolean;
}

interface UserPenaltiesAlertProps {
  professionalId: string;
}

export function UserPenaltiesAlert({ professionalId }: UserPenaltiesAlertProps) {
  const [activePenalties, setActivePenalties] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivePenalties();
  }, [professionalId]);

  const fetchActivePenalties = async () => {
    try {
      const { data, error } = await supabase
        .from("user_penalties")
        .select("*")
        .eq("professional_id", professionalId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivePenalties(data || []);
    } catch (error) {
      console.error("Error fetching penalties:", error);
    } finally {
      setLoading(false);
    }
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
          <AlertDescription className="space-y-2">
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
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
