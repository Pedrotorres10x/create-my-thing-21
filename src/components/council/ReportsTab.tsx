import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle, ArrowUpCircle, Gavel, Vote, User } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

interface ReportVote {
  id: string;
  report_id: string;
  voter_id: string;
  vote: string;
  severity: string | null;
  reasoning: string;
  created_at: string;
}

interface ReportsTabProps {
  reports: EthicsReport[];
  loading: boolean;
  statusFilter: string;
  onCastVote: (params: {
    reportId: string;
    vote: "sanction" | "dismiss" | "escalate";
    severity?: "light" | "serious" | "very_serious";
    reasoning: string;
  }) => void;
  isCastingVote: boolean;
  reportVotes: ReportVote[];
  currentProfessionalId: string | null;
  committeeMembers: { id: string; full_name: string }[];
}

const SEVERITY_CONFIG = {
  light: { label: "Leve", points: 20, days: 0, description: "-20 puntos" },
  serious: { label: "Grave", points: 50, days: 7, description: "-50 pts + 7 días" },
  very_serious: { label: "Muy grave", points: 100, days: 30, description: "-100 pts + 30 días" },
};

const VOTE_LABELS: Record<string, { label: string; icon: typeof Gavel; color: string }> = {
  sanction: { label: "Sancionar", icon: Gavel, color: "text-destructive" },
  dismiss: { label: "Desestimar", icon: XCircle, color: "text-muted-foreground" },
  escalate: { label: "Escalar", icon: ArrowUpCircle, color: "text-primary" },
};

export function ReportsTab({
  reports,
  loading,
  statusFilter,
  onCastVote,
  isCastingVote,
  reportVotes,
  currentProfessionalId,
  committeeMembers,
}: ReportsTabProps) {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [selectedVote, setSelectedVote] = useState<"sanction" | "dismiss" | "escalate">("sanction");
  const [severity, setSeverity] = useState<"light" | "serious" | "very_serious">("light");

  const filtered = reports.filter(r => 
    statusFilter === "pending" 
      ? r.status === "pending" || r.status === "under_ethics_review"
      : r.status === statusFilter
  );

  const handleCastVote = (report: EthicsReport) => {
    if (!reasoning.trim()) return;
    onCastVote({
      reportId: report.id,
      vote: selectedVote,
      severity: selectedVote === "sanction" ? severity : undefined,
      reasoning: reasoning.trim(),
    });
    setActiveReportId(null);
    setReasoning("");
    setSelectedVote("sanction");
    setSeverity("light");
  };

  const getVotesForReport = (reportId: string) => reportVotes.filter(v => v.report_id === reportId);
  const hasVoted = (reportId: string) => getVotesForReport(reportId).some(v => v.voter_id === currentProfessionalId);

  const getMemberName = (voterId: string) => {
    const member = committeeMembers.find(m => m.id === voterId);
    return member?.full_name || "Miembro";
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
      {filtered.map(report => {
        const votes = getVotesForReport(report.id);
        const alreadyVoted = hasVoted(report.id);
        const totalVotes = votes.length;

        return (
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Vote className="w-3 h-3 mr-1" />
                    {totalVotes}/3 votos
                  </Badge>
                  {alreadyVoted && (
                    <Badge variant="secondary">Ya votaste</Badge>
                  )}
                </div>
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

              {votes.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Vote className="h-4 w-4" /> Votos emitidos ({votes.length}/3)
                  </p>
                  <div className="grid gap-2">
                    {votes.map(v => {
                      const voteConfig = VOTE_LABELS[v.vote];
                      const VoteIcon = voteConfig?.icon || Gavel;
                      return (
                        <div key={v.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getMemberName(v.voter_id).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{getMemberName(v.voter_id)}</p>
                              <Badge variant="outline" className={`text-xs ${voteConfig?.color}`}>
                                <VoteIcon className="h-3 w-3 mr-1" />
                                {voteConfig?.label}
                                {v.vote === "sanction" && v.severity && (
                                  <span className="ml-1">({SEVERITY_CONFIG[v.severity as keyof typeof SEVERITY_CONFIG]?.label})</span>
                                )}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{v.reasoning}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalVotes < 3 && (
                    <p className="text-xs text-muted-foreground">
                      Esperando voto de: {committeeMembers
                        .filter(m => !votes.some(v => v.voter_id === m.id))
                        .map(m => m.full_name)
                        .join(", ")}
                    </p>
                  )}
                </div>
              )}

              {!alreadyVoted && activeReportId === report.id ? (
                <div className="space-y-4 pt-3 border-t">
                  <div className="space-y-2">
                    <Label>Tu voto</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={selectedVote === "sanction" ? "destructive" : "outline"}
                        onClick={() => setSelectedVote("sanction")}
                        className="flex-1"
                        size="sm"
                      >
                        <Gavel className="h-4 w-4 mr-1" />
                        Sancionar
                      </Button>
                      <Button
                        type="button"
                        variant={selectedVote === "dismiss" ? "secondary" : "outline"}
                        onClick={() => setSelectedVote("dismiss")}
                        className="flex-1"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Desestimar
                      </Button>
                      <Button
                        type="button"
                        variant={selectedVote === "escalate" ? "default" : "outline"}
                        onClick={() => setSelectedVote("escalate")}
                        className="flex-1"
                        size="sm"
                      >
                        <ArrowUpCircle className="h-4 w-4 mr-1" />
                        Escalar
                      </Button>
                    </div>
                  </div>

                  {selectedVote === "sanction" && (
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
                  )}

                  <div className="space-y-2">
                    <Label>Razonamiento *</Label>
                    <Textarea
                      placeholder="Explica tu decisión..."
                      value={reasoning}
                      onChange={(e) => setReasoning(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">{reasoning.length}/500</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCastVote(report)}
                      disabled={!reasoning.trim() || isCastingVote}
                    >
                      {isCastingVote ? "Enviando..." : "Emitir voto"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setActiveReportId(null); setReasoning(""); }}>
                      Cancelar
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    La decisión se ejecutará cuando 2 de 3 miembros voten igual.
                  </p>
                </div>
              ) : !alreadyVoted ? (
                <Button onClick={() => setActiveReportId(report.id)}>
                  <Vote className="h-4 w-4 mr-2" />
                  Emitir mi voto
                </Button>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
