import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, ArrowUpCircle, Gavel, History, Vote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HistoryReport {
  id: string;
  report_type: string;
  description: string;
  status: string;
  created_at: string;
  ethics_committee_reviewed_at: string | null;
  ethics_committee_resolution: string | null;
  reporter: { full_name: string; email: string };
  reported: { full_name: string; email: string };
  reviewer?: { full_name: string };
}

interface ReportVote {
  id: string;
  report_id: string;
  voter_id: string;
  vote: string;
  severity: string | null;
  reasoning: string;
}

interface DecisionHistoryTabProps {
  reports: HistoryReport[];
  loading: boolean;
  reportVotes: ReportVote[];
  committeeMembers: { id: string; full_name: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Gavel }> = {
  resolved_by_ethics: { label: "Sancionado", variant: "destructive", icon: Gavel },
  dismissed: { label: "Desestimado", variant: "secondary", icon: XCircle },
  escalated: { label: "Escalado", variant: "default", icon: ArrowUpCircle },
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  spam: "Spam o publicidad",
  inappropriate_contact: "Contacto inapropiado",
  fraud: "Fraude o estafa",
  harassment: "Acoso",
  fake_profile: "Perfil falso",
  other: "Otro",
};

export function DecisionHistoryTab({ reports, loading, reportVotes, committeeMembers }: DecisionHistoryTabProps) {
  const getMemberName = (voterId: string) => committeeMembers.find(m => m.id === voterId)?.full_name || "Miembro";

  if (loading) return <div className="animate-pulse">Cargando historial...</div>;

  if (reports.length === 0) {
    return (
      <Alert>
        <History className="h-4 w-4" />
        <AlertDescription>No hay decisiones previas registradas.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Últimas {reports.length} decisiones del Consejo de Sabios
      </p>
      {reports.map(report => {
        const config = STATUS_CONFIG[report.status] || STATUS_CONFIG.dismissed;
        const Icon = config.icon;
        const votes = reportVotes.filter(v => v.report_id === report.id);

        return (
          <Card key={report.id} className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {report.reported.full_name} · reportado por {report.reporter.full_name}
                  </p>
                </div>
                <Badge variant={config.variant}>
                  <Icon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{report.description}</p>

              {report.ethics_committee_resolution && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Resolución:</p>
                  <p className="text-sm text-muted-foreground">{report.ethics_committee_resolution}</p>
                </div>
              )}

              {votes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Vote className="h-3 w-3" /> Votos ({votes.length}/3)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {votes.map(v => (
                      <div key={v.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-md text-xs">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">{getMemberName(v.voter_id).charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{getMemberName(v.voter_id)}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {v.vote === "sanction" ? "Sancionar" : v.vote === "dismiss" ? "Desestimar" : "Escalar"}
                          {v.severity && ` (${v.severity === "light" ? "Leve" : v.severity === "serious" ? "Grave" : "Muy grave"})`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Resuelto el {report.ethics_committee_reviewed_at
                  ? new Date(report.ethics_committee_reviewed_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
