import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Users, CheckCircle, Clock, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  creator: {
    id: string;
    full_name: string;
    photo_url: string | null;
  };
  required_specializations: number[];
  participants: Array<{
    professional_id: string;
    status: string;
    profession_specialization_id: number | null;
    professionals: {
      full_name: string;
      photo_url: string | null;
    };
  }>;
}

interface CollaborationOpportunitiesProps {
  sphereId: number;
  chapterId: string | null;
}

export const CollaborationOpportunities = ({
  sphereId,
  chapterId
}: CollaborationOpportunitiesProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentProfessionalId, setCurrentProfessionalId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentProfessional();
    loadProjects();
  }, [sphereId, chapterId]);

  const loadCurrentProfessional = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setCurrentProfessionalId(data.id);
    }
  };

  const loadProjects = async () => {
    try {
      let query = supabase
        .from("sphere_collaborative_projects")
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          required_specializations,
          creator:creator_id (
            id,
            full_name,
            photo_url
          ),
          sphere_project_participants (
            professional_id,
            status,
            profession_specialization_id,
            professionals (
              full_name,
              photo_url
            )
          )
        `)
        .eq("business_sphere_id", sphereId)
        .order("created_at", { ascending: false });

      if (chapterId) {
        query = query.eq("chapter_id", chapterId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map the data to match our Project interface
      const mappedProjects = (data || []).map(project => ({
        ...project,
        participants: project.sphere_project_participants
      }));
      
      setProjects(mappedProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProject = async (projectId: string) => {
    if (!currentProfessionalId) return;

    try {
      const { error } = await supabase
        .from("sphere_project_participants")
        .insert({
          project_id: projectId,
          professional_id: currentProfessionalId,
          status: "confirmed"
        });

      if (error) throw error;

      toast({
        title: "¡Te has unido al proyecto!",
        description: "Ahora eres parte de este proyecto colaborativo"
      });

      loadProjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo unir al proyecto",
        variant: "destructive"
      });
    }
  };

  const isParticipant = (project: Project) => {
    return project.participants.some(
      p => p.professional_id === currentProfessionalId
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Proyectos Colaborativos</h2>
          <p className="text-muted-foreground">
            Colabora con otros profesionales de tu esfera
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Proyecto
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No hay proyectos colaborativos activos. ¡Crea el primero!
          </CardContent>
        </Card>
      ) : (
        projects.map((project) => {
          const confirmedCount = project.participants.filter(
            p => p.status === "confirmed"
          ).length;
          const totalNeeded = project.required_specializations.length;

          return (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle>{project.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={project.creator.photo_url || ""} />
                        <AvatarFallback>
                          {project.creator.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{project.creator.full_name}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(project.created_at), {
                          addSuffix: true,
                          locale: es
                        })}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      project.status === "active"
                        ? "default"
                        : project.status === "completed"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {project.status === "active" && "Activo"}
                    {project.status === "completed" && "Completado"}
                    {project.status === "cancelled" && "Cancelado"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{project.description}</p>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Participantes ({confirmedCount}/{totalNeeded})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {project.participants
                      .filter(p => p.status === "confirmed")
                      .map((participant, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={participant.professionals.photo_url || ""}
                            />
                            <AvatarFallback>
                              {participant.professionals.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{participant.professionals.full_name}</span>
                        </div>
                      ))}

                    {Array.from({
                      length: totalNeeded - confirmedCount
                    }).map((_, idx) => (
                      <div
                        key={`pending-${idx}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Clock className="h-4 w-4" />
                        <span>Pendiente de asignación</span>
                      </div>
                    ))}
                  </div>
                </div>

                {project.status === "active" &&
                  !isParticipant(project) &&
                  confirmedCount < totalNeeded && (
                    <Button
                      onClick={() => handleJoinProject(project.id)}
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Unirme al Proyecto
                    </Button>
                  )}

                {isParticipant(project) && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">
                      Eres parte de este proyecto
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        sphereId={sphereId}
        chapterId={chapterId}
        onSuccess={loadProjects}
      />
    </div>
  );
};
