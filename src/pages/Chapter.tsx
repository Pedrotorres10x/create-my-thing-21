import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar, Award } from "lucide-react";
import { PointsLevelBadge } from "@/components/PointsLevelBadge";

interface Chapter {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  description: string | null;
  meeting_schedule: string | null;
  location_details: string | null;
  member_count: number;
}

interface ChapterMember {
  id: string;
  full_name: string;
  position: string | null;
  company_name: string | null;
  photo_url: string | null;
  total_points: number;
  sector_catalog: {
    name: string;
  } | null;
}

const Chapter = () => {
  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [members, setMembers] = useState<ChapterMember[]>([]);
  const [myProfessionalId, setMyProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    loadChapterData();
  }, []);

  const loadChapterData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user's professional profile
      const { data: professional } = await supabase
        .from('professionals')
        .select('id, chapter_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .single();

      if (!professional) {
        setLoading(false);
        return;
      }

      setMyProfessionalId(professional.id);

      if (!professional.chapter_id) {
        setLoading(false);
        return;
      }

      // Get chapter details
      const { data: chapterData } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', professional.chapter_id)
        .single();

      if (chapterData) {
        setChapter(chapterData);

        // Get chapter members
        const { data: membersData } = await supabase
          .from('professionals')
          .select(`
            id,
            full_name,
            position,
            company_name,
            photo_url,
            total_points,
            sector_catalog (
              name
            )
          `)
          .eq('chapter_id', professional.chapter_id)
          .eq('status', 'approved')
          .order('total_points', { ascending: false });

        if (membersData) {
          setMembers(membersData as any);
        }
      }
    } catch (error) {
      console.error('Error loading chapter data:', error);
    } finally {
      setLoading(false);
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

  if (!chapter) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mi Capítulo</h1>
          <p className="text-muted-foreground">Miembros y actividades de tu capítulo</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sin Capítulo Asignado</CardTitle>
            <CardDescription>Aún no has sido asignado a un capítulo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Serás asignado a un capítulo según tu ubicación. Contacta con el administrador para más información.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{chapter.name}</h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-2">
          <MapPin className="h-4 w-4" />
          {chapter.city}, {chapter.state}
        </p>
      </div>

      {/* Chapter Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información del Capítulo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {chapter.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Descripción</h4>
                <p className="text-sm text-muted-foreground">{chapter.description}</p>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{chapter.member_count} miembros</span>
            </div>
            {chapter.meeting_schedule && (
              <div className="flex items-start gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Calendario de Reuniones</p>
                  <p className="text-muted-foreground">{chapter.meeting_schedule}</p>
                </div>
              </div>
            )}
            {chapter.location_details && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Ubicación</p>
                  <p className="text-muted-foreground">{chapter.location_details}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estadísticas del Capítulo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Miembros</span>
              <Badge variant="secondary">{chapter.member_count}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Puntos Totales</span>
              <Badge variant="secondary">
                {members.reduce((sum, m) => sum + m.total_points, 0)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Miembros del Capítulo
          </CardTitle>
          <CardDescription>
            Conecta con otros profesionales de tu área
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member, index) => (
              <Card key={member.id} className={member.id === myProfessionalId ? "border-primary" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.photo_url || undefined} />
                      <AvatarFallback>
                        {member.full_name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm truncate">
                          {member.full_name}
                          {member.id === myProfessionalId && (
                            <Badge variant="outline" className="ml-2 text-xs">Tú</Badge>
                          )}
                        </h4>
                        {index < 3 && (
                          <Award className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      {member.position && (
                        <p className="text-xs text-muted-foreground truncate">{member.position}</p>
                      )}
                      {member.company_name && (
                        <p className="text-xs text-muted-foreground truncate">{member.company_name}</p>
                      )}
                      {member.sector_catalog && (
                        <Badge variant="secondary" className="text-xs mt-2">
                          {member.sector_catalog.name}
                        </Badge>
                      )}
                      <div className="mt-2">
                        <PointsLevelBadge points={member.total_points} size="sm" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chapter;
