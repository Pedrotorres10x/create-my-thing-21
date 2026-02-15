import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Map, Briefcase, HandshakeIcon, MapPin, Calendar, UserPlus } from "lucide-react";
import { SphereDirectory } from "@/components/sphere/SphereDirectory";
import { SpecializationMap } from "@/components/sphere/SpecializationMap";
import { CollaborationOpportunities } from "@/components/sphere/CollaborationOpportunities";
import { SphereReferencesManager } from "@/components/sphere/SphereReferencesManager";
// RecommendClient moved to its own page
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface SphereInfo {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
}

interface ChapterInfo {
  id: string;
  name: string;
  apellido: string | null;
  city: string;
  state: string;
  member_count: number;
  meeting_schedule: string | null;
  location_details: string | null;
}

export default function MyBusinessSphere() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sphereInfo, setSphereInfo] = useState<SphereInfo | null>(null);
  const [chapterInfo, setChapterInfo] = useState<ChapterInfo | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("directory");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadData();

    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [user, navigate, location]);

  const loadData = async () => {
    try {
      const { data: professional } = await supabase
        .from("professionals")
        .select(`
          id,
          business_sphere_id,
          chapter_id,
          business_spheres (id, name, icon, color)
        `)
        .eq("user_id", user?.id)
        .single();

      if (professional?.business_spheres) {
        setSphereInfo(professional.business_spheres as SphereInfo);
        setChapterId(professional.chapter_id);
        setProfessionalId(professional.id);

        if (professional.chapter_id) {
          const { data: chapter } = await supabase
            .from("chapters")
            .select("id, name, apellido, city, state, member_count, meeting_schedule, location_details")
            .eq("id", professional.chapter_id)
            .single();
          if (chapter) setChapterInfo(chapter);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!sphereInfo) {
    return (
      <div className="py-8">
        <Card className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Tu Tribu te espera</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Alic.ia te ayudará a elegir tu esfera de negocio y conectar con profesionales complementarios. Ve a Alic.IA y habla con ella.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Ir a Alic.IA
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with chapter info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${sphereInfo.color}20` }}
          >
            <span className="text-2xl">🌐</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Mi Tribu</h1>
            <p className="text-muted-foreground">
              {sphereInfo.name}
              {chapterInfo && (
                <span className="ml-2">
                  · <MapPin className="inline h-3 w-3" /> {chapterInfo.city}, {chapterInfo.state}
                  · <Users className="inline h-3 w-3" /> {chapterInfo.member_count} miembros
                </span>
              )}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate("/referrals")} variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Invitar Profesional
        </Button>
      </div>

      {/* Chapter quick stats */}
      {chapterInfo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{chapterInfo.member_count}</p>
              <p className="text-xs text-muted-foreground">Miembros</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{chapterInfo.name}{chapterInfo.apellido ? ` ${chapterInfo.apellido}` : ''}</p>
              <p className="text-xs text-muted-foreground">Tribu</p>
            </CardContent>
          </Card>
          {chapterInfo.meeting_schedule && (
            <Card>
              <CardContent className="p-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Reuniones</p>
                  <p className="text-sm font-medium truncate">{chapterInfo.meeting_schedule}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {chapterInfo.location_details && (
            <Card>
              <CardContent className="p-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Ubicación</p>
                  <p className="text-sm font-medium truncate">{chapterInfo.location_details}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
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
      </Tabs>
    </div>
  );
}
