import { useEthicsCommittee } from "@/hooks/useEthicsCommittee";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, AlertTriangle, CheckCircle, XCircle, ArrowUpCircle } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EthicsCommittee() {
  const {
    isCommitteeMember,
    checkingMembership,
    committeeMembers,
    loadingMembers,
    pendingReports,
    loadingReports,
    resolveReport,
    resolvingReport,
  } = useEthicsCommittee();

  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

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
            No tienes acceso al Comité de Ética. Solo los 3 profesionales con mejor ranking pueden acceder.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleResolve = (reportId: string, decision: "resolved" | "escalate" | "dismiss") => {
    if (!resolution.trim()) {
      return;
    }
    
    resolveReport(
      { reportId, decision, resolutionNotes: resolution },
      {
        onSuccess: () => {
          setActiveReportId(null);
          setResolution("");
        },
      }
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Comité de Ética</h1>
          <p className="text-muted-foreground">
            Revisión de quejas y disputas de la comunidad
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Miembros del Comité</CardTitle>
          <CardDescription>Top 3 profesionales por ranking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {committeeMembers.map((member, index) => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={member.photo_url || undefined} />
                  <AvatarFallback>
                    {member.full_name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{member.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.total_points} puntos
                  </p>
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Coordinador
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes ({pendingReports.filter((r) => r.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="reviewing">
            En revisión ({pendingReports.filter((r) => r.status === "under_ethics_review").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {loadingReports ? (
            <div>Cargando reportes...</div>
          ) : pendingReports.filter((r) => r.status === "pending").length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No hay reportes pendientes</AlertDescription>
            </Alert>
          ) : (
            pendingReports
              .filter((r) => r.status === "pending")
              .map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {report.report_type === "inappropriate_content" && "Contenido inapropiado"}
                          {report.report_type === "spam" && "Spam"}
                          {report.report_type === "harassment" && "Acoso"}
                          {report.report_type === "other" && "Otro"}
                        </CardTitle>
                        <CardDescription>
                          Reportado el {new Date(report.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Nuevo
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
                          <Button
                            variant="default"
                            onClick={() => handleResolve(report.id, "resolved")}
                            disabled={!resolution.trim() || resolvingReport}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Resolver
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => handleResolve(report.id, "escalate")}
                            disabled={!resolution.trim() || resolvingReport}
                          >
                            <ArrowUpCircle className="w-4 h-4 mr-2" />
                            Escalar a Admin
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleResolve(report.id, "dismiss")}
                            disabled={!resolution.trim() || resolvingReport}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Desestimar
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setActiveReportId(null);
                              setResolution("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={() => setActiveReportId(report.id)}>
                        Revisar caso
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="reviewing" className="space-y-4 mt-4">
          {pendingReports.filter((r) => r.status === "under_ethics_review").length === 0 ? (
            <Alert>
              <AlertDescription>No hay reportes en revisión</AlertDescription>
            </Alert>
          ) : (
            <div>Reportes en revisión por otros miembros del comité</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
