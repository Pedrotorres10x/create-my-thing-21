import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, XCircle, Eye, Shield, TrendingDown, UserX, Clock, Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RedFlagAlert {
  id: string;
  professional_id: string;
  alert_type: string;
  severity: string;
  ai_analysis: string;
  ai_confidence: number;
  evidence: any;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  professionals?: {
    full_name: string;
    email: string;
    photo_url: string | null;
    company_name: string | null;
  };
}

const alertTypeLabels: Record<string, { label: string; icon: typeof AlertTriangle }> = {
  referrals_no_deals: { label: "Referidos sin cierre", icon: TrendingDown },
  meetings_no_activity: { label: "Meetings sin actividad", icon: Clock },
  ratio_imbalance: { label: "Ratio desbalanceado", icon: UserX },
  inactivity_post_referral: { label: "Inactividad post-referido", icon: XCircle },
};

const severityColors: Record<string, string> = {
  low: "bg-yellow-100 text-yellow-800 border-yellow-300",
  medium: "bg-orange-100 text-orange-800 border-orange-300",
  high: "bg-red-100 text-red-800 border-red-300",
  critical: "bg-red-200 text-red-900 border-red-500",
};

export const RedFlagsDashboard = () => {
  const [alerts, setAlerts] = useState<RedFlagAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<"pending" | "reviewed" | "all">("pending");
  const [selectedAlert, setSelectedAlert] = useState<RedFlagAlert | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("red_flag_alerts")
      .select("*, professionals(full_name, email, photo_url, company_name)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter === "pending" ? "pending" : "reviewed");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading red flags:", error);
    } else {
      setAlerts(data || []);
    }
    setLoading(false);
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-red-flags");
      if (error) throw error;
      toast({
        title: "Análisis completado",
        description: data?.message || "Análisis finalizado",
      });
      loadAlerts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo ejecutar el análisis",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const updateAlertStatus = async (alertId: string, status: "confirmed" | "dismissed") => {
    const { error } = await (supabase as any)
      .from("red_flag_alerts")
      .update({
        status,
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
      return;
    }

    toast({
      title: status === "confirmed" ? "⚠️ Alerta confirmada" : "✅ Alerta descartada",
      description: status === "confirmed"
        ? "Se ha marcado como fraude confirmado"
        : "Se ha descartado la alerta",
    });
    setSelectedAlert(null);
    setAdminNotes("");
    loadAlerts();
  };

  const pendingCount = alerts.filter((a) => a.status === "pending").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Red Flags — Detección de Evasión
          </h2>
          <p className="text-sm text-muted-foreground">
            IA analiza patrones de usuarios que podrían estar operando fuera de la plataforma
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={analyzing}>
          {analyzing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {analyzing ? "Analizando..." : "Ejecutar análisis"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={pendingCount > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-2xl text-destructive">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Confirmadas</CardDescription>
            <CardTitle className="text-2xl">
              {alerts.filter((a) => a.status === "confirmed").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Descartadas</CardDescription>
            <CardTitle className="text-2xl">
              {alerts.filter((a) => a.status === "dismissed").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total alertas</CardDescription>
            <CardTitle className="text-2xl">{alerts.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["pending", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "pending" ? `Pendientes (${pendingCount})` : "Todas"}
          </Button>
        ))}
      </div>

      {/* Alerts list */}
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No hay alertas {filter === "pending" ? "pendientes" : ""}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const typeInfo = alertTypeLabels[alert.alert_type] || {
              label: alert.alert_type,
              icon: AlertTriangle,
            };
            const TypeIcon = typeInfo.icon;

            return (
              <Card
                key={alert.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  alert.status === "pending" ? "border-l-4 border-l-destructive" : ""
                }`}
                onClick={() => {
                  setSelectedAlert(alert);
                  setAdminNotes(alert.admin_notes || "");
                }}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <TypeIcon className="h-5 w-5 mt-0.5 text-destructive shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold">
                            {alert.professionals?.full_name || "Unknown"}
                          </span>
                          <Badge className={severityColors[alert.severity] || ""}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{typeInfo.label}</Badge>
                          {alert.status !== "pending" && (
                            <Badge variant={alert.status === "confirmed" ? "destructive" : "secondary"}>
                              {alert.status === "confirmed" ? "Confirmada" : "Descartada"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {alert.ai_analysis}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Confianza IA: {Math.round(alert.ai_confidence)}%</span>
                          <span>{new Date(alert.created_at).toLocaleDateString("es-ES")}</span>
                          {alert.professionals?.company_name && (
                            <span>{alert.professionals.company_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAlert && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Red Flag: {selectedAlert.professionals?.full_name}
                </DialogTitle>
                <DialogDescription>
                  {alertTypeLabels[selectedAlert.alert_type]?.label || selectedAlert.alert_type}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Severity & confidence */}
                <div className="flex gap-3">
                  <Badge className={severityColors[selectedAlert.severity] || ""}>
                    Severidad: {selectedAlert.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">Confianza IA: {Math.round(selectedAlert.ai_confidence)}%</Badge>
                </div>

                {/* AI Analysis */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Análisis de IA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedAlert.ai_analysis}</p>
                  </CardContent>
                </Card>

                {/* Evidence */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Evidencia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(selectedAlert.evidence || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b pb-1">
                          <span className="text-muted-foreground">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Admin notes */}
                {selectedAlert.status === "pending" ? (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Notas del admin</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Añade notas sobre tu decisión..."
                      rows={3}
                    />
                  </div>
                ) : (
                  selectedAlert.admin_notes && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Notas del admin</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{selectedAlert.admin_notes}</p>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>

              {selectedAlert.status === "pending" && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => updateAlertStatus(selectedAlert.id, "dismissed")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Descartar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => updateAlertStatus(selectedAlert.id, "confirmed")}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Confirmar fraude
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
