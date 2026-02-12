import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle, ArrowUpCircle, Gavel } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface EthicsReport {
  id: string;
  report_type: string;
  description: string;
  status: string;
  context: string | null;
  created_at: string;
  reported_id: string;
  reporter: { full_name: string; email: string };
  reported: { full_name: string; email: string };
}

interface ReportsTabProps {
  reports: EthicsReport[];
  loading: boolean;
  statusFilter: string;
  onResolve: (params: {
    reportId: string;
    decision: "resolved" | "escalate" | "dismiss";
    resolutionNotes: string;
    severity?: "light" | "serious" | "very_serious";
    reportedId?: string;
  }, options: any) => void;
  isResolving: boolean;
}

const SEVERITY_CONFIG = {
  light: { label: "Leve", points: 20, days: 0, description: "-20 puntos" },
  serious: { label: "Grave", points: 50, days: 7, description: "-50 puntos + 7 días suspensión" },
  very_serious: { label: "Muy grave", points: 100, days: 30, description: "-100 puntos + 30 días suspensión" },
};

export function ReportsTab({ reports, loading, statusFilter, onResolve, isResolving }: ReportsTabProps) {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [severity, setSeverity] = useState<"light" | "serious" | "very_serious">("light");

  const filtered = reports.filter(r => r.status === statusFilter);

  const handleResolve = (report: EthicsReport, decision: "resolved" | "escalate" | "dismiss") => {
    if (!resolution.trim()) return;
    onResolve(
      {
        reportId: report.id,
        decision,
        resolutionNotes: resolution,
        severity: decision === "resolved" ? severity : undefined,
        reportedId: decision === "resolved" ? report.reported_id : undefined,
      },
      { onSuccess: () => { setActiveReportId(null); setResolution(""); setSeverity("light"); } }
    );
  };

  const reportTypeLabels: Record<string, string> = {
    spam: "Spam o publicidad",
    inappropriate_contact: "Contacto inapropiado",
    fraud: "Fraude o estafa",
    harassment: "Acoso",
    fake_profile: "Perfil falso",
    other: "Otro",
  };

  if (loading) return <div>Cargando reportes...</div>;

  if (filtered.length === 0) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          {statusFilter === "pending" ? "No hay reportes pendientes" : "No hay reportes en revisión"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map(report => (
        <Card key={report.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  {reportTypeLabels[report.report_type] || report.report_type}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Reportado el {new Date(report.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {statusFilter === "pending" ? "Nuevo" : "En revisión"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Reportado por:</p>
                <p className="text-muted-foreground">{report.reporter.full_name}</p>
              </div>
              <div>
                <p className="font-medium">Usuario reportado:</p>
                <p className="text-muted-foreground">{report.reported.full_name}</p>
              </div>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Descripción:</p>
              <p className="text-sm text-muted-foreground">{report.description}</p>
            </div>
            {report.context && (
              <div>
                <p className="font-medium text-sm mb-1">Contexto:</p>
                <p className="text-sm text-muted-foreground">{report.context}</p>
              </div>
            )}
            {activeReportId === report.id ? (
              <div className="space-y-4 pt-3 border-t">
                <div className="space-y-2">
                  <Label>Gravedad de la falta</Label>
                  <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="font-medium">{config.label}</span>
                          <span className="text-muted-foreground ml-2">— {config.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Escribe tu resolución o notas..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="default" onClick={() => handleResolve(report, "resolved")} disabled={!resolution.trim() || isResolving}>
                    <Gavel className="w-4 h-4 mr-2" />
                    Sancionar ({SEVERITY_CONFIG[severity].description})
                  </Button>
                  <Button variant="secondary" onClick={() => handleResolve(report, "escalate")} disabled={!resolution.trim() || isResolving}>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Escalar a Admin
                  </Button>
                  <Button variant="outline" onClick={() => handleResolve(report, "dismiss")} disabled={!resolution.trim() || isResolving}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Desestimar
                  </Button>
                  <Button variant="ghost" onClick={() => { setActiveReportId(null); setResolution(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setActiveReportId(report.id)}>Revisar caso</Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
