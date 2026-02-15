import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Map, Briefcase, HandshakeIcon, MapPin, Calendar, UserPlus, Globe } from "lucide-react";
import { SphereDirectory } from "@/components/sphere/SphereDirectory";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpecializationMap } from "@/components/sphere/SpecializationMap";
import { CollaborationOpportunities } from "@/components/sphere/CollaborationOpportunities";
import { SphereReferencesManager } from "@/components/sphere/SphereReferencesManager";
// RecommendClient moved to its own page
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TribeBalanceIndicator } from "@/components/chapter/TribeBalanceIndicator";
import { TribeRoleNeeds } from "@/components/chapter/TribeRoleNeeds";

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
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sphereInfo, setSphereInfo] = useState<SphereInfo | null>(null);
  const [chapterInfo, setChapterInfo] = useState<ChapterInfo | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("directory");
  const [geoScope, setGeoScope] = useState<string>("chapter");
  const [allChapters, setAllChapters] = useState<ChapterInfo[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [selectedCommunity, setSelectedCommunity] = useState<string>("all");
  const [roleBalance, setRoleBalance] = useState<{ referrers: number; receivers: number; hybrids: number; unknown: number; total: number } | null>(null);

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

        // Load all chapters for geographic filtering
        const { data: chaptersData } = await supabase
          .from("chapters")
          .select("id, name, apellido, city, state, member_count, meeting_schedule, location_details")
          .order("name");
        
        if (chaptersData) setAllChapters(chaptersData);

        if (professional.chapter_id) {
          const chapter = chaptersData?.find(c => c.id === professional.chapter_id);
          if (chapter) setChapterInfo(chapter);

          // Load role balance for the chapter
          // @ts-ignore - Complex nested select
          const { data: membersRoles } = await supabase
            .from('professionals')
            .select('specializations (referral_role)')
            .eq('chapter_id', professional.chapter_id)
            .eq('status', 'approved');

          if (membersRoles) {
            const roles = (membersRoles as any[]).map(m => m.specializations?.referral_role);
            setRoleBalance({
              referrers: roles.filter(r => r === 'referrer').length,
              receivers: roles.filter(r => r === 'receiver').length,
              hybrids: roles.filter(r => r === 'hybrid').length,
              unknown: roles.filter(r => !r).length,
              total: roles.length,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Compute geographic filter values
  const cities = [...new Set(allChapters.map(c => c.city))].sort();
  const provinces = [...new Set(allChapters.map(c => c.state))].sort();
  // For now communities = provinces since we don't have a separate community field
  const communities = provinces;

  // Compute which chapter IDs to filter by based on geo scope
  const getGeoFilteredChapterIds = (): string[] | null => {
    switch (geoScope) {
      case "chapter":
        return chapterId ? [chapterId] : null;
      case "city":
        if (selectedCity === "all") return allChapters.map(c => c.id);
        return allChapters.filter(c => c.city === selectedCity).map(c => c.id);
      case "province":
        if (selectedProvince === "all") return allChapters.map(c => c.id);
        return allChapters.filter(c => c.state === selectedProvince).map(c => c.id);
      case "community":
        if (selectedCommunity === "all") return allChapters.map(c => c.id);
        return allChapters.filter(c => c.state === selectedCommunity).map(c => c.id);
      case "country":
        return null; // All chapters = whole country
      default:
        return chapterId ? [chapterId] : null;
    }
  };

  const geoChapterIds = getGeoFilteredChapterIds();

  const getScopeLabel = () => {
    switch (geoScope) {
      case "chapter": return chapterInfo ? `${chapterInfo.name}` : "Tu Tribu";
      case "city": return selectedCity === "all" ? "Todas las ciudades" : selectedCity;
      case "province": return selectedProvince === "all" ? "Todas las provincias" : selectedProvince;
      case "community": return selectedCommunity === "all" ? "Todas las CC.AA." : selectedCommunity;
      case "country": return "Toda España";
      default: return "Tu Tribu";
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
            <h1 className="text-xl sm:text-3xl font-bold">Mi Tribu</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Esfera {sphereInfo.name}
              {chapterInfo && (
                <span className="block sm:inline sm:ml-2">
                  · <MapPin className="inline h-3 w-3" /> {chapterInfo.city}, {chapterInfo.state}
                  · <Users className="inline h-3 w-3" /> {chapterInfo.member_count} miembros
                </span>
              )}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate("/referrals")} size="lg" className="shadow-md w-full md:w-auto">
          <UserPlus className="h-5 w-5 mr-2" />
          Invitar Profesional
        </Button>
      </div>

      {/* Chapter quick stats */}
      {chapterInfo && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold">{chapterInfo.member_count}</p>
              <p className="text-xs text-muted-foreground">Miembros</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-sm sm:text-lg font-bold truncate">{chapterInfo.name}{chapterInfo.apellido ? ` ${chapterInfo.apellido}` : ''}</p>
              <p className="text-xs text-muted-foreground">Tribu</p>
            </CardContent>
          </Card>
          {chapterInfo.meeting_schedule && (
            <Card>
              <CardContent className="p-3 sm:p-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Reuniones</p>
                  <p className="text-xs sm:text-sm font-medium truncate">{chapterInfo.meeting_schedule}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {chapterInfo.location_details && (
            <Card>
              <CardContent className="p-3 sm:p-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Ubicación</p>
                  <p className="text-xs sm:text-sm font-medium truncate">{chapterInfo.location_details}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tribe balance indicator */}
      {isAdmin && roleBalance && roleBalance.total > 0 && (
        <TribeBalanceIndicator balance={roleBalance} />
      )}

      {/* Public: suggestions on who to invite */}
      <TribeRoleNeeds chapterId={chapterInfo?.id || null} />

      {/* Geographic scope selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Alcance geográfico</span>
            <Badge variant="outline" className="text-xs">{getScopeLabel()}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Select value={geoScope} onValueChange={(v) => setGeoScope(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Ámbito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chapter">Mi Tribu</SelectItem>
                <SelectItem value="city">Ciudad</SelectItem>
                <SelectItem value="province">Provincia</SelectItem>
                <SelectItem value="community">Comunidad Autónoma</SelectItem>
                <SelectItem value="country">Todo el País</SelectItem>
              </SelectContent>
            </Select>

            {geoScope === "city" && (
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Ciudad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las ciudades</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {geoScope === "province" && (
              <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                <SelectTrigger>
                  <SelectValue placeholder="Provincia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las provincias</SelectItem>
                  {provinces.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {geoScope === "community" && (
              <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                <SelectTrigger>
                  <SelectValue placeholder="Comunidad Autónoma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las CC.AA.</SelectItem>
                  {communities.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

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
          <SphereDirectory sphereId={sphereInfo.id} chapterId={chapterId} chapterIds={geoChapterIds} />
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
