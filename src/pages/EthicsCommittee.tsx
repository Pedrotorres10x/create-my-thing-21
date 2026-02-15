import { useEthicsCommittee } from "@/hooks/useEthicsCommittee";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Crown, Eye, Scale, History, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpulsionReviewsTab } from "@/components/council/ExpulsionReviewsTab";
import { ReentryRequestsTab } from "@/components/council/ReentryRequestsTab";
import { ReportsTab } from "@/components/council/ReportsTab";
import { DecisionHistoryTab } from "@/components/council/DecisionHistoryTab";
import { SpecializationConflictsTab } from "@/components/council/SpecializationConflictsTab";

const COUNCIL_TITLES = [
  { title: "El Estratega", icon: Crown, description: "Líder del Consejo" },
  { title: "El Guardián", icon: Shield, description: "Protector de la comunidad" },
  { title: "El Juez", icon: Scale, description: "Árbitro final" },
];

export default function EthicsCommittee() {
  const {
    professionalId,
    isCommitteeMember,
    checkingMembership,
    committeeMembers,
    pendingReports,
    loadingReports,
    resolvedReports,
    loadingHistory,
    expulsionReviews,
    loadingExpulsions,
    expulsionVotes,
    castVote,
    castingVote,
    reentryRequests,
    loadingReentries,
    reportVotes,
    castReportVote,
    castingReportVote,
    conflictRequests,
    loadingConflicts,
    conflictVotes,
    castConflictVote,
    castingConflictVote,
  } = useEthicsCommittee();

  if (checkingMembership) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Verificando permisos...</div>
      </div>
    );
  }

  if (!isCommitteeMember) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            No tienes acceso a El Consejo. Solo los 3 profesionales con mayor ranking pueden acceder.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const pendingExpulsions = expulsionReviews.filter(r => r.status === "pending").length;
  const pendingReentries = reentryRequests.filter((r: any) => r.status === "pending").length;
  const pendingReportCount = pendingReports.filter(r => r.status === "pending").length;
  const pendingConflicts = conflictRequests.filter((c: any) => c.status === "pending").length;
  const escalatedConflicts = conflictRequests.filter((c: any) => c.status === "escalated_to_admin").length;
  const totalConflicts = pendingConflicts + escalatedConflicts;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with narrative */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Crown className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">El Consejo</h1>
          <p className="text-muted-foreground font-medium">
            Los que deciden quién se queda y quién se va
          </p>
        </div>
      </div>

      {/* Council Members with titles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Los 3 del Consejo
          </CardTitle>
          <CardDescription>
            Los profesionales con mayor ranking tienen el poder de decidir sobre expulsiones y reentradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {committeeMembers.map((member, index) => {
              const council = COUNCIL_TITLES[index] || COUNCIL_TITLES[0];
              const Icon = council.icon;
              return (
                <div
                  key={member.id}
                  className="flex flex-col items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border/50 text-center"
                >
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={member.photo_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {member.full_name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                      <Icon className="h-3 w-3" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold">{member.full_name}</p>
                    <Badge variant="secondary" className="mt-1">
                      {council.title}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {member.total_points} pts · {council.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="expulsions" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="conflicts">
            <Users className="h-4 w-4 mr-1" />
            Conflictos {totalConflicts > 0 && `(${totalConflicts})`}
          </TabsTrigger>
          <TabsTrigger value="expulsions">
            Expulsiones {pendingExpulsions > 0 && `(${pendingExpulsions})`}
          </TabsTrigger>
          <TabsTrigger value="reentries">
            Reentradas {pendingReentries > 0 && `(${pendingReentries})`}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Reportes {pendingReportCount > 0 && `(${pendingReportCount})`}
          </TabsTrigger>
          <TabsTrigger value="reviewing">
            En revisión
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conflicts" className="mt-4">
          <SpecializationConflictsTab
            conflicts={conflictRequests as any}
            loading={loadingConflicts}
            votes={conflictVotes as any}
            currentProfessionalId={professionalId}
            onVote={castConflictVote}
            isVoting={castingConflictVote}
          />
        </TabsContent>

        <TabsContent value="expulsions" className="mt-4">
          <ExpulsionReviewsTab
            reviews={expulsionReviews}
            votes={expulsionVotes}
            professionalId={professionalId}
            onVote={castVote}
            isVoting={castingVote}
          />
        </TabsContent>

        <TabsContent value="reentries" className="mt-4">
          <ReentryRequestsTab
            requests={reentryRequests as any}
            loading={loadingReentries}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <ReportsTab
            reports={pendingReports}
            loading={loadingReports}
            statusFilter="pending"
            onCastVote={castReportVote}
            isCastingVote={castingReportVote}
            reportVotes={reportVotes}
            currentProfessionalId={professionalId}
            committeeMembers={committeeMembers}
          />
        </TabsContent>

        <TabsContent value="reviewing" className="mt-4">
          <ReportsTab
            reports={pendingReports}
            loading={loadingReports}
            statusFilter="under_ethics_review"
            onCastVote={castReportVote}
            isCastingVote={castingReportVote}
            reportVotes={reportVotes}
            currentProfessionalId={professionalId}
            committeeMembers={committeeMembers}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <DecisionHistoryTab
            reports={resolvedReports as any}
            loading={loadingHistory}
            reportVotes={reportVotes}
            committeeMembers={committeeMembers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
