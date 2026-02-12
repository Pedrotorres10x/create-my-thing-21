import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Users, Map, Newspaper, Briefcase, HandshakeIcon } from "lucide-react";
import { SphereDirectory } from "@/components/sphere/SphereDirectory";
import { SpecializationMap } from "@/components/sphere/SpecializationMap";
import { SphereFeed } from "@/components/sphere/SphereFeed";
import { CollaborationOpportunities } from "@/components/sphere/CollaborationOpportunities";
import { SphereReferencesManager } from "@/components/sphere/SphereReferencesManager";
import { Skeleton } from "@/components/ui/skeleton";

interface SphereInfo {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
}

export default function MyBusinessSphere() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sphereInfo, setSphereInfo] = useState<SphereInfo | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("directory");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadSphereInfo();

    // Check if coming from notification
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [user, navigate, location]);

  const loadSphereInfo = async () => {
    try {
      const { data: professional } = await supabase
        .from("professionals")
        .select(`
          id,
          business_sphere_id,
          chapter_id,
          business_spheres (
            id,
            name,
            icon,
            color
          )
        `)
        .eq("user_id", user?.id)
        .single();

      if (professional?.business_spheres) {
        setSphereInfo(professional.business_spheres as SphereInfo);
        setChapterId(professional.chapter_id);
        setProfessionalId(professional.id);
      }
    } catch (error) {
      console.error("Error loading sphere info:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!sphereInfo) {
    return (
      <div className="container py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No tienes una esfera asignada</h2>
          <p className="text-muted-foreground mb-6">
            Completa tu perfil para ser asignado a una esfera de negocio.
          </p>
          <button
            onClick={() => navigate("/profile")}
            className="btn btn-primary"
          >
            Completar Perfil
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${sphereInfo.color}20` }}
        >
          <span className="text-2xl">🌐</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold">Mi Aldea: {sphereInfo.name}</h1>
          <p className="text-muted-foreground">
            Conecta y colabora con profesionales complementarios
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Directorio</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Especialidades</span>
          </TabsTrigger>
          <TabsTrigger value="references" className="flex items-center gap-2">
            <HandshakeIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Referencias</span>
          </TabsTrigger>
          <TabsTrigger value="feed" className="flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            <span className="hidden sm:inline">Feed</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Proyectos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-6">
          <SphereDirectory sphereId={sphereInfo.id} chapterId={chapterId} />
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <SpecializationMap sphereId={sphereInfo.id} chapterId={chapterId} />
        </TabsContent>

        <TabsContent value="references" className="mt-6">
          {professionalId && (
            <SphereReferencesManager currentProfessionalId={professionalId} />
          )}
        </TabsContent>

        <TabsContent value="feed" className="mt-6">
          <SphereFeed sphereId={sphereInfo.id} />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <CollaborationOpportunities 
            sphereId={sphereInfo.id} 
            chapterId={chapterId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
