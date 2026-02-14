import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, CheckCircle, XCircle, PlusCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface ConflictRequest {
  id: string;
  applicant_specialization: string;
  applicant_description: string | null;
  existing_specialization: string;
  status: string;
  votes_approve: number;
  votes_reject: number;
  votes_new_chapter: number;
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

export function SpecializationConflictsTab({ conflicts, loading, votes, currentProfessionalId, onVote, isVoting }: Props) {
  const [reasoning, setReasoning] = useState<Record<string, string>>({});

  if (loading) return <div className="animate-pulse p-4">Cargando conflictos...</div>;

  const pendingConflicts = conflicts.filter(c => c.status === "pending");

  if (pendingConflicts.length === 0) {
    return (
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>No hay conflictos de especialización pendientes.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {pendingConflicts.map((conflict) => {
        const myVote = votes.find(v => v.conflict_request_id === conflict.id && v.voter_id === currentProfessionalId);
        const allVotes = votes.filter(v => v.conflict_request_id === conflict.id);

        return (
          <Card key={conflict.id} className="border-warning/30">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Conflicto de especialización
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {conflict.chapter.name} · {conflict.chapter.city}
                  </p>
                </div>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  {conflict.votes_approve + conflict.votes_reject + conflict.votes_new_chapter}/3 votos
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {/* Voting area */}
              {myVote ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ya has votado: <strong>{myVote.vote === 'approve' ? 'Aprobar entrada' : myVote.vote === 'reject' ? 'Rechazar' : 'Nueva Tribu'}</strong>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm font-medium">¿Pueden convivir en la misma Tribu?</p>
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
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
