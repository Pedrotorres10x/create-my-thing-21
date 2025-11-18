import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, XCircle, Eye, Flag, Shield, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppealsManagement } from "@/components/admin/AppealsManagement";

interface UserReport {
  id: string;
  report_type: string;
  description: string;
  status: string;
  created_at: string;
  context: string | null;
  context_id: string | null;
  reporter: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
  reported: {
    id: string;
    full_name: string;
    email: string;
    photo_url: string | null;
    total_points: number;
  };
}

interface ModerationViolation {
  id: string;
  violation_type: string;
  severity: string;
  reason: string;
  categories: string[] | null;
  content_context: string | null;
  blocked: boolean;
  created_at: string;
  professionals: {
    full_name: string;
    email: string;
    photo_url: string | null;
  };
}

export default function AdminModeration() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [violations, setViolations] = useState<ModerationViolation[]>([]);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionType, setActionType] = useState<"dismiss" | "warn" | "restrict" | "ban">("dismiss");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchViolations();
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("user_reports")
      .select(`
        *,
        reporter:reporter_id(id, full_name, photo_url),
        reported:reported_id(id, full_name, email, photo_url, total_points)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
      return;
    }

    setReports(data as any);
  };

  const fetchViolations = async () => {
    const { data, error } = await supabase
      .from("moderation_violations")
      .select(`
        *,
        professionals(full_name, email, photo_url)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching violations:", error);
      return;
    }

    setViolations(data as any);
  };

  const handleReportAction = async () => {
    if (!selectedReport) return;

    setLoading(true);
    try {
      // Actualizar estado del reporte
      const newStatus = actionType === "dismiss" ? "dismissed" : "action_taken";
      const { error: reportError } = await supabase
        .from("user_reports")
        .update({
          status: newStatus,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedReport.id);

      if (reportError) throw reportError;

      // Aplicar penalización si no es dismissal
      if (actionType !== "dismiss") {
        let penaltyType = "warning";
        let severity = "low";
        let pointsDeducted = 0;
        let restrictionUntil = null;

        switch (actionType) {
          case "warn":
            penaltyType = "warning";
            severity = "low";
            pointsDeducted = 25;
            break;
          case "restrict":
            penaltyType = "temporary_restriction";
            severity = "medium";
            pointsDeducted = 100;
            restrictionUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case "ban":
            penaltyType = "permanent_ban";
            severity = "critical";
            pointsDeducted = 500;
            break;
        }

        const { error: penaltyError } = await supabase.from("user_penalties").insert({
          professional_id: selectedReport.reported.id,
          penalty_type: penaltyType,
          severity,
          reason: `Revisión manual: ${adminNotes}`,
          points_deducted: pointsDeducted,
          restriction_until: restrictionUntil,
        });

        if (penaltyError) throw penaltyError;

        // Actualizar puntos
        await supabase
          .from("professionals")
          .update({
            total_points: Math.max((selectedReport.reported.total_points || 0) - pointsDeducted, 0),
          })
          .eq("id", selectedReport.reported.id);

        // Si es ban, bloquear usuario
        if (actionType === "ban") {
          await supabase
            .from("professionals")
            .update({
              moderation_blocked: true,
              moderation_block_reason: `Revisión manual de administrador: ${adminNotes}`,
              status: "rejected",
            })
            .eq("id", selectedReport.reported.id);
        }
      }

      toast({
        title: "✅ Acción completada",
        description: "El reporte ha sido procesado exitosamente.",
      });

      setActionDialogOpen(false);
      setSelectedReport(null);
      setAdminNotes("");
      fetchReports();
    } catch (error) {
      console.error("Error processing report:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar el reporte.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getReportTypeBadge = (type: string) => {
    const config: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
      spam: { label: "Spam", variant: "secondary" },
      inappropriate_contact: { label: "Contacto inapropiado", variant: "default" },
      fraud: { label: "Fraude", variant: "destructive" },
      harassment: { label: "Acoso", variant: "destructive" },
      fake_profile: { label: "Perfil falso", variant: "default" },
      other: { label: "Otro", variant: "secondary" },
    };
    const { label, variant } = config[type] || config.other;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; icon: any; variant: "default" | "destructive" | "secondary" }> = {
      pending: { label: "Pendiente", icon: AlertCircle, variant: "default" },
      reviewed: { label: "Revisado", icon: Eye, variant: "secondary" },
      action_taken: { label: "Acción tomada", icon: CheckCircle, variant: "default" },
      dismissed: { label: "Descartado", icon: XCircle, variant: "secondary" },
    };
    const { label, icon: Icon, variant } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Panel de Moderación
          </h1>
          <p className="text-muted-foreground">Gestión de reportes y violaciones</p>
        </div>
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList>
          <TabsTrigger value="reports">
            <Flag className="h-4 w-4 mr-2" />
            Reportes de Usuarios ({reports.filter((r) => r.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="violations">
            <AlertCircle className="h-4 w-4 mr-2" />
            Violaciones de IA ({violations.length})
          </TabsTrigger>
          <TabsTrigger value="appeals">
            <FileText className="h-4 w-4 mr-2" />
            Apelaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay reportes pendientes
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getReportTypeBadge(report.report_type)}
                        {getStatusBadge(report.status)}
                      </div>
                      <CardDescription>
                        Reportado el {format(new Date(report.created_at), "PPP 'a las' p", { locale: es })}
                      </CardDescription>
                    </div>
                    {report.status === "pending" && (
                      <Button
                        onClick={() => {
                          setSelectedReport(report);
                          setActionDialogOpen(true);
                        }}
                      >
                        Revisar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Reportó:</p>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={report.reporter.photo_url || ""} />
                          <AvatarFallback>{report.reporter.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{report.reporter.full_name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Usuario reportado:</p>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={report.reported.photo_url || ""} />
                          <AvatarFallback>{report.reported.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{report.reported.full_name}</p>
                          <p className="text-xs text-muted-foreground">{report.reported.email}</p>
                          <p className="text-xs text-muted-foreground">Puntos: {report.reported.total_points}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Descripción:</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{report.description}</p>
                  </div>

                  {report.context && (
                    <div className="text-xs text-muted-foreground">
                      Contexto: {report.context}
                      {report.context_id && ` (ID: ${report.context_id})`}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          {violations.map((violation) => (
            <Card key={violation.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge variant={violation.severity === "high" ? "destructive" : "default"}>
                        {violation.severity === "high" ? "Alta" : violation.severity === "medium" ? "Media" : "Baja"}
                      </Badge>
                      {violation.violation_type}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(violation.created_at), "PPP 'a las' p", { locale: es })}
                    </CardDescription>
                  </div>
                  {violation.blocked && (
                    <Badge variant="destructive">
                      <Shield className="h-3 w-3 mr-1" />
                      Bloqueado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={violation.professionals.photo_url || ""} />
                    <AvatarFallback>{violation.professionals.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{violation.professionals.full_name}</p>
                    <p className="text-sm text-muted-foreground">{violation.professionals.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Razón:</p>
                  <p className="text-sm text-muted-foreground">{violation.reason}</p>
                </div>

                {violation.categories && violation.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {violation.categories.map((cat, idx) => (
                      <Badge key={idx} variant="outline">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}

                {violation.content_context && (
                  <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                    Contexto: {violation.content_context}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="appeals" className="space-y-4">
          <AppealsManagement />
        </TabsContent>
      </Tabs>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Revisar Reporte</DialogTitle>
            <DialogDescription>
              Toma una decisión sobre este reporte. Las acciones se registrarán en el historial.
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium">{selectedReport.reported.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedReport.reported.email}</p>
                <p className="text-sm">Puntos actuales: {selectedReport.reported.total_points}</p>
              </div>

              <div className="space-y-2">
                <Label>Acción *</Label>
                <Select value={actionType} onValueChange={(v: any) => setActionType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dismiss">Descartar reporte (sin acción)</SelectItem>
                    <SelectItem value="warn">Advertencia (-25 puntos)</SelectItem>
                    <SelectItem value="restrict">Restricción temporal (-100 puntos, 14 días)</SelectItem>
                    <SelectItem value="ban">Bloqueo permanente (-500 puntos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Notas del administrador *</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Explica la razón de tu decisión..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleReportAction} disabled={loading || !adminNotes.trim()}>
              {loading ? "Procesando..." : "Aplicar acción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
