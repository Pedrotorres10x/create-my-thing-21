import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PointsLevelBadge } from "@/components/PointsLevelBadge";
import {
  ArrowLeft,
  Briefcase,
  Award,
  MapPin,
  Calendar,
  Send,
  Globe,
} from "lucide-react";

interface ProfessionalData {
  id: string;
  full_name: string;
  business_name: string | null;
  photo_url: string | null;
  total_points: number;
  years_experience: number | null;
  bio: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  chapter_id: string | null;
  profession_specializations: { name: string } | null;
}

interface ChapterData {
  name: string;
  apellido: string | null;
  city: string;
  state: string;
}

export default function ProfessionalProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [professional, setProfessional] = useState<ProfessionalData | null>(null);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentProfessionalId, setCurrentProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadProfile();
    loadCurrentProfessional();
  }, [id, user]);

  const loadCurrentProfessional = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (data) setCurrentProfessionalId(data.id);
  };

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("professionals_public")
        .select(`
          id,
          full_name,
          business_name,
          photo_url,
          total_points,
          years_experience,
          bio,
          website,
          city,
          state,
          chapter_id,
          profession_specializations ( name )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      const profData = data as unknown as ProfessionalData;
      setProfessional(profData);

      // Load chapter separately to avoid RLS join issues
      if (profData.chapter_id) {
        const { data: chapter } = await supabase
          .from("chapters")
          .select("name, apellido, city, state")
          .eq("id", profData.chapter_id)
          .single();
        if (chapter) setChapterData(chapter as unknown as ChapterData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const isOwnProfile = currentProfessionalId === id;

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">Profesional no encontrado.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  const chapterFullName = chapterData
    ? `${chapterData.name}${chapterData.apellido ? ` ${chapterData.apellido}` : ""}`
    : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-28 w-28">
              <AvatarImage src={professional.photo_url || ""} />
              <AvatarFallback className="text-3xl">
                {professional.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{professional.full_name}</h1>

              {professional.profession_specializations && (
                <Badge variant="secondary">
                  {professional.profession_specializations.name}
                </Badge>
              )}

              <div className="flex justify-center">
                <PointsLevelBadge points={professional.total_points} size="sm" />
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex gap-2 w-full max-w-sm">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => navigate(`/meetings`)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Reunión
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/recomendacion?to=${professional.id}`)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Referir
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {professional.business_name && (
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{professional.business_name}</span>
            </div>
          )}
          {professional.years_experience && (
            <div className="flex items-center gap-3">
              <Award className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{professional.years_experience} años de experiencia</span>
            </div>
          )}
          {chapterFullName && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>
                {chapterFullName}
                {chapterData && ` · ${chapterData.city}, ${chapterData.state}`}
              </span>
            </div>
          )}
          {professional.website && (
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a href={professional.website} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {professional.website}
              </a>
            </div>
          )}
          {professional.bio && (
            <p className="text-muted-foreground pt-2 border-t">{professional.bio}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
