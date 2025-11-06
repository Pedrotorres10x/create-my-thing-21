import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, TrendingUp } from "lucide-react";
import { PointsLevelBadge } from "@/components/PointsLevelBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Professional {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  company_name: string | null;
  total_points: number;
  chapter_id: string | null;
  sector_id: number;
  sector_catalog: {
    name: string;
  } | null;
  chapters: {
    name: string;
  } | null;
}

interface Chapter {
  id: string;
  name: string;
}

interface Sector {
  id: number;
  name: string;
}

const Rankings = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfessionalId, setMyProfessionalId] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: myProf } = await supabase
          .from('professionals')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();
        
        if (myProf) {
          setMyProfessionalId(myProf.id);
        }
      }

      const [profsRes, chaptersRes, sectorsRes] = await Promise.all([
        supabase
          .from('professionals')
          .select(`
            id,
            full_name,
            photo_url,
            position,
            company_name,
            total_points,
            chapter_id,
            sector_id,
            sector_catalog (
              name
            ),
            chapters (
              name
            )
          `)
          .eq('status', 'approved')
          .order('total_points', { ascending: false }),
        supabase.from('chapters').select('id, name').order('name'),
        supabase.from('sector_catalog').select('id, name').order('name')
      ]);

      if (profsRes.data) setProfessionals(profsRes.data as any);
      if (chaptersRes.data) setChapters(chaptersRes.data);
      if (sectorsRes.data) setSectors(sectorsRes.data);
    } catch (error) {
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfessionals = professionals.filter(prof => {
    if (chapterFilter !== "all" && prof.chapter_id !== chapterFilter) return false;
    if (sectorFilter !== "all" && prof.sector_id.toString() !== sectorFilter) return false;
    return true;
  });

  const topPerformers = filteredProfessionals.slice(0, 3);
  const myRank = filteredProfessionals.findIndex(p => p.id === myProfessionalId) + 1;
  const myProfile = filteredProfessionals.find(p => p.id === myProfessionalId);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rankings</h1>
        <p className="text-muted-foreground">Clasificación de miembros por puntos</p>
      </div>

      {/* My Position Card */}
      {myProfile && myRank > 0 && (
        <Card className="border-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={myProfile.photo_url || undefined} />
                  <AvatarFallback>
                    {myProfile.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Tu Posición</p>
                  <h3 className="text-2xl font-bold">#{myRank}</h3>
                  <p className="text-sm font-medium">{myProfile.total_points} puntos</p>
                </div>
              </div>
              <div className="text-right">
                <PointsLevelBadge points={myProfile.total_points} size="md" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Capítulo</label>
              <Select value={chapterFilter} onValueChange={setChapterFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los capítulos</SelectItem>
                  {chapters.map(chapter => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sector</label>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los sectores</SelectItem>
                  {sectors.map(sector => (
                    <SelectItem key={sector.id} value={sector.id.toString()}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            <TrendingUp className="mr-2 h-4 w-4" />
            Clasificación General
          </TabsTrigger>
          <TabsTrigger value="top">
            <Trophy className="mr-2 h-4 w-4" />
            Top 3
          </TabsTrigger>
        </TabsList>

        <TabsContent value="top" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 3 Performers</CardTitle>
              <CardDescription>Los miembros con más puntos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((prof, index) => (
                  <Card key={prof.id} className={index === 0 ? "border-yellow-500 border-2" : ""}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {getRankIcon(index + 1)}
                        </div>
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={prof.photo_url || undefined} />
                          <AvatarFallback>
                            {prof.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg truncate">{prof.full_name}</h3>
                            {prof.id === myProfessionalId && (
                              <Badge variant="outline" className="text-xs">Tú</Badge>
                            )}
                          </div>
                          {prof.position && (
                            <p className="text-sm text-muted-foreground truncate">{prof.position}</p>
                          )}
                          {prof.company_name && (
                            <p className="text-sm text-muted-foreground truncate">{prof.company_name}</p>
                          )}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {prof.sector_catalog && (
                              <Badge variant="secondary" className="text-xs">
                                {prof.sector_catalog.name}
                              </Badge>
                            )}
                            {prof.chapters && (
                              <Badge variant="outline" className="text-xs">
                                {prof.chapters.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{prof.total_points}</p>
                          <p className="text-xs text-muted-foreground">puntos</p>
                          <div className="mt-2">
                            <PointsLevelBadge points={prof.total_points} size="sm" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Clasificación Completa</CardTitle>
              <CardDescription>
                {filteredProfessionals.length} profesionales clasificados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredProfessionals.map((prof, index) => {
                  const rank = index + 1;
                  return (
                    <div
                      key={prof.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        prof.id === myProfessionalId ? 'border-primary bg-primary/5' : 'bg-card'
                      }`}
                    >
                      <div className="w-12 text-center font-bold text-lg">
                        {rank <= 3 ? getRankIcon(rank) : `#${rank}`}
                      </div>
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={prof.photo_url || undefined} />
                        <AvatarFallback>
                          {prof.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">{prof.full_name}</h4>
                          {prof.id === myProfessionalId && (
                            <Badge variant="outline" className="text-xs">Tú</Badge>
                          )}
                        </div>
                        {prof.position && (
                          <p className="text-sm text-muted-foreground truncate">
                            {prof.position}
                            {prof.company_name && ` • ${prof.company_name}`}
                          </p>
                        )}
                        <div className="flex gap-2 mt-1">
                          {prof.sector_catalog && (
                            <Badge variant="secondary" className="text-xs">
                              {prof.sector_catalog.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{prof.total_points}</p>
                        <p className="text-xs text-muted-foreground">puntos</p>
                        <div className="mt-1">
                          <PointsLevelBadge points={prof.total_points} size="sm" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Miembros</CardDescription>
            <CardTitle className="text-3xl">{filteredProfessionals.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Puntos Totales</CardDescription>
            <CardTitle className="text-3xl">
              {filteredProfessionals.reduce((sum, p) => sum + p.total_points, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Promedio de Puntos</CardDescription>
            <CardTitle className="text-3xl">
              {Math.round(
                filteredProfessionals.reduce((sum, p) => sum + p.total_points, 0) / 
                (filteredProfessionals.length || 1)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default Rankings;
