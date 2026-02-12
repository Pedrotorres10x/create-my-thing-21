import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, UserX, Gavel } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ReentryRequest {
  id: string;
  professional_id: string;
  status: string;
  reason: string;
  admin_notes: string | null;
  created_at: string;
  professional: {
    full_name: string;
    email: string;
    expulsion_count: number;
    last_expulsion_at: string | null;
  };
}

interface ReentryRequestsTabProps {
  requests: ReentryRequest[];
  loading: boolean;
}

export function ReentryRequestsTab({ requests, loading }: ReentryRequestsTabProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const pendingRequests = requests.filter(r => r.status === "pending");
  const resolvedRequests = requests.filter(r => r.status !== "pending");

  const handleDecision = async (requestId: string, decision: "approved" | "rejected") => {
    if (!notes.trim()) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("reentry_requests")
        .update({
          status: decision,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      if (decision === "approved") {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          await supabase
            .from("professionals")
            .update({ status: "approved" })
            .eq("id", request.professional_id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["reentry-requests"] });
      toast.success(decision === "approved" ? "Reentrada aprobada" : "Reentrada rechazada");
      setActiveId(null);
      setNotes("");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al procesar la solicitud");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Cargando solicitudes...</div>;

  return (
    <div className="space-y-6">
      {pendingRequests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No hay solicitudes de reentrada pendientes
          </CardContent>
        </Card>
      ) : (
        pendingRequests.map(req => {
          const monthsSinceExpulsion = req.professional.last_expulsion_at
            ? Math.floor((Date.now() - new Date(req.professional.last_expulsion_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
            : null;

          return (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {req.professional.full_name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{req.professional.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{req.professional.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    Expulsiones: {req.professional.expulsion_count}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm bg-muted/50 p-3 rounded-lg space-y-2">
                  <div>
                    <p className="font-medium">Motivo de solicitud:</p>
                    <p className="text-muted-foreground">{req.reason}</p>
                  </div>
                  {monthsSinceExpulsion !== null && (
                    <p className="text-xs text-muted-foreground">
                      Tiempo desde expulsión: {monthsSinceExpulsion} meses
                    </p>
                  )}
                </div>

                {activeId === req.id ? (
                  <div className="space-y-3 pt-3 border-t">
                    <Textarea
                      placeholder="Notas sobre la decisión..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDecision(req.id, "approved")}
                        disabled={!notes.trim() || processing}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Aprobar reentrada
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDecision(req.id, "rejected")}
                        disabled={!notes.trim() || processing}
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Rechazar
                      </Button>
                      <Button variant="ghost" onClick={() => { setActiveId(null); setNotes(""); }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setActiveId(req.id)}>
                    <Gavel className="w-4 h-4 mr-2" />
                    Revisar solicitud
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {resolvedRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-muted-foreground">Solicitudes resueltas</h3>
          {resolvedRequests.map(req => (
            <Card key={req.id} className="opacity-80">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{req.professional.full_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <Badge variant={req.status === "approved" ? "secondary" : "destructive"}>
                  {req.status === "approved" ? "Aprobada" : "Rechazada"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
