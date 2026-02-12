import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Gavel, UserX, UserCheck, Timer } from "lucide-react";
import { useState } from "react";

interface ExpulsionReview {
  id: string;
  professional_id: string;
  trigger_type: string;
  trigger_details: any;
  status: string;
  votes_for_expulsion: number;
  votes_against: number;
  votes_extend: number;
  decided_at: string | null;
  auto_expire_at: string;
  created_at: string;
  professional: {
    full_name: string;
    email: string;
    expulsion_count: number;
  };
}

interface ExpulsionVote {
  id: string;
  review_id: string;
  voter_id: string;
  vote: string;
  reasoning: string;
  created_at: string;
}

interface ExpulsionReviewsTabProps {
  reviews: ExpulsionReview[];
  votes: ExpulsionVote[];
  professionalId: string | null;
  onVote: (params: { reviewId: string; vote: "expel" | "absolve" | "extend"; reasoning: string }) => void;
  isVoting: boolean;
}

export function ExpulsionReviewsTab({ reviews, votes, professionalId, onVote, isVoting }: ExpulsionReviewsTabProps) {
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState("");

  const pendingReviews = reviews.filter(r => r.status === "pending");
  const decidedReviews = reviews.filter(r => r.status !== "pending");

  const handleVote = (reviewId: string, vote: "expel" | "absolve" | "extend") => {
    if (!reasoning.trim()) return;
    onVote({ reviewId, vote, reasoning });
    setActiveReviewId(null);
    setReasoning("");
  };

  const hasVoted = (reviewId: string) => {
    return votes.some(v => v.review_id === reviewId && v.voter_id === professionalId);
  };

  const getTimeRemaining = (autoExpireAt: string) => {
    const diff = new Date(autoExpireAt).getTime() - Date.now();
    if (diff <= 0) return "Expirado";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h restantes`;
  };

  const statusLabel: Record<string, string> = {
    approved: "Expulsado",
    rejected: "Absuelto",
    extended: "Prórroga",
    auto_expired: "Auto-expulsado",
  };

  return (
    <div className="space-y-6">
      {/* Pending cases */}
      {pendingReviews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Gavel className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No hay casos de expulsión pendientes
          </CardContent>
        </Card>
      ) : (
        pendingReviews.map(review => {
          const details = review.trigger_details || {};
          const voted = hasVoted(review.id);
          const totalVotes = review.votes_for_expulsion + review.votes_against + review.votes_extend;

          return (
            <Card key={review.id} className="border-destructive/30">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-destructive/10 text-destructive">
                        {review.professional.full_name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{review.professional.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{review.professional.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {getTimeRemaining(review.auto_expire_at)}
                    </Badge>
                    {review.professional.expulsion_count > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Expulsión previa: {review.professional.expulsion_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-3 rounded-lg">
                  <div>
                    <p className="font-medium">Meses inactivo</p>
                    <p className="text-2xl font-bold text-destructive">{details.months_inactive || "?"}</p>
                  </div>
                  <div>
                    <p className="font-medium">Último referido</p>
                    <p className="text-muted-foreground">
                      {details.last_referral_at
                        ? new Date(details.last_referral_at).toLocaleDateString()
                        : "Nunca"}
                    </p>
                  </div>
                </div>

                {/* Vote status */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Votos: {totalVotes}/3</span>
                  {voted && <Badge variant="secondary">Ya votaste</Badge>}
                </div>

                {/* Voting UI */}
                {!voted && activeReviewId === review.id ? (
                  <div className="space-y-3 pt-3 border-t">
                    <Textarea
                      placeholder="Justifica tu decisión (obligatorio)..."
                      value={reasoning}
                      onChange={(e) => setReasoning(e.target.value)}
                      rows={3}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="destructive"
                        onClick={() => handleVote(review.id, "expel")}
                        disabled={!reasoning.trim() || isVoting}
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Expulsar
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => handleVote(review.id, "absolve")}
                        disabled={!reasoning.trim() || isVoting}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Absolver
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleVote(review.id, "extend")}
                        disabled={!reasoning.trim() || isVoting}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Prórroga (1 mes)
                      </Button>
                      <Button variant="ghost" onClick={() => { setActiveReviewId(null); setReasoning(""); }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : !voted ? (
                  <Button onClick={() => setActiveReviewId(review.id)} className="w-full">
                    <Gavel className="w-4 h-4 mr-2" />
                    Emitir voto
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Decided cases (history) */}
      {decidedReviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-muted-foreground">Decisiones pasadas</h3>
          {decidedReviews.map(review => {
            const reviewVotes = votes.filter(v => v.review_id === review.id);
            return (
              <Card key={review.id} className="opacity-80">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{review.professional.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={review.status === "rejected" ? "secondary" : "destructive"}>
                      {statusLabel[review.status] || review.status}
                    </Badge>
                  </div>
                  {reviewVotes.length > 0 && (
                    <div className="mt-3 space-y-1 text-sm">
                      {reviewVotes.map(v => (
                        <div key={v.id} className="flex items-center gap-2 text-muted-foreground">
                          <span className="capitalize">{v.vote === "expel" ? "⛔" : v.vote === "absolve" ? "✅" : "⏳"}</span>
                          <span className="truncate">{v.reasoning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
