import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle, ArrowUpCircle } from "lucide-react";
import { useState } from "react";

interface EthicsReport {
  id: string;
  report_type: string;
  description: string;
  status: string;
  context: string | null;
  created_at: string;
  reporter: { full_name: string; email: string };
  reported: { full_name: string; email: string };
}

interface ReportsTabProps {
  reports: EthicsReport[];
  loading: boolean;
  statusFilter: string;
  onResolve: (params: { reportId: string; decision: "resolved" | "escalate" | "dismiss"; resolutionNotes: string }, options: any) => void;
  isResolving: boolean;
}

export function ReportsTab({ reports, loading, statusFilter, onResolve, isResolving }: ReportsTabProps) {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  const filtered = reports.filter(r => r.status === statusFilter);

  const handleResolve = (reportId: string, decision: "resolved" | "escalate" | "dismiss") => {
    if (!resolution.trim()) return;
    onResolve(
      { reportId, decision, resolutionNotes: resolution },
      { onSuccess: () => { setActiveReportId(null); setResolution(""); } }
    );
  };

  const reportTypeLabels: Record<string, string> = {
    inappropriate_content: "Contenido inapropiado",
    spam: "Spam",
    harassment: "Acoso",
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
              <div className="space-y-3 pt-3 border-t">
                <Textarea
                  placeholder="Escribe tu resolución o notas..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button variant="default" onClick={() => handleResolve(report.id, "resolved")} disabled={!resolution.trim() || isResolving}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Resolver
                  </Button>
                  <Button variant="secondary" onClick={() => handleResolve(report.id, "escalate")} disabled={!resolution.trim() || isResolving}>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Escalar a Admin
                  </Button>
                  <Button variant="outline" onClick={() => handleResolve(report.id, "dismiss")} disabled={!resolution.trim() || isResolving}>
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
