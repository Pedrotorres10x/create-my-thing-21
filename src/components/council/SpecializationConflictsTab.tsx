import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, CheckCircle, XCircle, PlusCircle, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import { useState } from "react";

interface ConflictRequest {
  id: string;
  applicant_specialization: string;
  applicant_description: string | null;
  existing_specialization: string;
  existing_member_approval: string | null;
  status: string;
  votes_approve: number;
  votes_reject: number;
  votes_new_chapter: number;
  decision_reason: string | null;
  created_at: string;
  decided_at: string | null;
  applicant: { full_name: string; email: string };
  existing_professional: { full_name: string; email: string };
  chapter: { name: string; city: string };
}

interface ConflictVote {
  id: string;
  conflict_request_id: string;
  voter_id: string;
  vote: string;
  reasoning: string;
}

interface Props {
  conflicts: ConflictRequest[];
  loading: boolean;
  votes: ConflictVote[];
  currentProfessionalId: string;
  onVote: (params: { conflictId: string; vote: string; reasoning: string }) => void;
  isVoting: boolean;
}

const ApprovalStatusBadge = ({ status }: { status: string | null }) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-500/10 text-green-600 border-green-300">✅ Aprobado</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/10 text-red-600 border-red-300">❌ Rechazado</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
  }
};

export function SpecializationConflictsTab({ conflicts, loading, votes, currentProfessionalId, onVote, isVoting }: Props) {
  const [reasoning, setReasoning] = useState<Record<string, string>>({});

  if (loading) return <div className="animate-pulse p-4">Cargando conflictos...</div>;

  const pendingConflicts = conflicts.filter(c => c.status === "pending");
  const escalatedConflicts = conflicts.filter(c => c.status === "escalated_to_admin");

  if (pendingConflicts.length === 0 && escalatedConflicts.length === 0) {
    return (
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>No hay conflictos de especialización pendientes.</AlertDescription>
      </Alert>
    );
  }

  const renderConflict = (conflict: ConflictRequest, isEscalated = false) => {
    const myVote = votes.find(v => v.conflict_request_id === conflict.id && v.voter_id === currentProfessionalId);
    const allVotes = votes.filter(v => v.conflict_request_id === conflict.id);

    return (
      <Card key={conflict.id} className={isEscalated ? "border-destructive/30" : "border-warning/30"}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {isEscalated ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
                {isEscalated ? "Escalado a Admin" : "Conflicto de especialización"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {conflict.chapter.name} · {conflict.chapter.city}
              </p>
            </div>
            <Badge variant="outline" className={isEscalated ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warning/10 text-warning border-warning/30"}>
              {conflict.votes_approve + conflict.votes_reject + conflict.votes_new_chapter}/3 votos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dual approval status */}
          <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground font-medium">Miembro existente:</span>
              <ApprovalStatusBadge status={conflict.existing_member_approval} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground font-medium">Comité:</span>
              {conflict.votes_approve + conflict.votes_reject + conflict.votes_new_chapter >= 3
                ? conflict.votes_approve >= 2
                  ? <Badge className="bg-green-500/10 text-green-600 border-green-300">✅ Aprobado</Badge>
                  : <Badge className="bg-red-500/10 text-red-600 border-red-300">❌ Rechazado</Badge>
                : <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Votando</Badge>
              }
            </div>
          </div>

          {/* Decision reason if escalated */}
          {isEscalated && conflict.decision_reason && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>{conflict.decision_reason}</AlertDescription>
            </Alert>
          )}

          {/* The two professionals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Solicita entrar</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {conflict.applicant.full_name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{conflict.applicant.full_name}</p>
                  <p className="text-xs text-muted-foreground">{conflict.applicant_specialization}</p>
                </div>
              </div>
              {conflict.applicant_description && (
                <p className="text-xs mt-2 text-muted-foreground italic">"{conflict.applicant_description}"</p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Ya está en la Tribu</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-secondary/10">
                    {conflict.existing_professional.full_name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{conflict.existing_professional.full_name}</p>
                  <p className="text-xs text-muted-foreground">{conflict.existing_specialization}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Existing votes */}
          {allVotes.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Votos emitidos:</p>
              {allVotes.map(v => (
                <div key={v.id} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className={
                    v.vote === 'approve' ? 'bg-green-500/10 text-green-600' :
                    v.vote === 'reject' ? 'bg-red-500/10 text-red-600' :
                    'bg-blue-500/10 text-blue-600'
                  }>
                    {v.vote === 'approve' ? 'Aprobar entrada' : v.vote === 'reject' ? 'Rechazar' : 'Nueva Tribu'}
                  </Badge>
                  <span className="text-muted-foreground">- {v.reasoning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Voting area (only for pending, not escalated) */}
          {!isEscalated && (
            myVote ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Ya has votado: <strong>{myVote.vote === 'approve' ? 'Aprobar entrada' : myVote.vote === 'reject' ? 'Rechazar' : 'Nueva Tribu'}</strong>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3 border-t pt-3">
                <p className="text-sm font-medium">¿Pueden convivir en la misma Tribu?</p>
                <p className="text-xs text-muted-foreground">
                  Si ambos (tú y el miembro existente) aprueban → entra automáticamente. Si alguno rechaza → se escala a administración.
                </p>
                <Textarea
                  placeholder="Explica tu razonamiento..."
                  value={reasoning[conflict.id] || ""}
                  onChange={(e) => setReasoning(prev => ({ ...prev, [conflict.id]: e.target.value }))}
                  className="min-h-[60px]"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-300 hover:bg-green-50"
                    disabled={isVoting || !reasoning[conflict.id]?.trim()}
                    onClick={() => onVote({ conflictId: conflict.id, vote: 'approve', reasoning: reasoning[conflict.id] })}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aprobar entrada
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    disabled={isVoting || !reasoning[conflict.id]?.trim()}
                    onClick={() => onVote({ conflictId: conflict.id, vote: 'reject', reasoning: reasoning[conflict.id] })}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    disabled={isVoting || !reasoning[conflict.id]?.trim()}
                    onClick={() => onVote({ conflictId: conflict.id, vote: 'new_chapter', reasoning: reasoning[conflict.id] })}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Que funde nueva Tribu
                  </Button>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {escalatedConflicts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Escalados a Admin ({escalatedConflicts.length})
          </h3>
          {escalatedConflicts.map(c => renderConflict(c, true))}
        </div>
      )}
      {pendingConflicts.map(c => renderConflict(c))}
    </div>
  );
}
