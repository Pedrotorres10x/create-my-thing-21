import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Trophy, ArrowRight } from "lucide-react";
import { PointsLevelBadge } from "@/components/PointsLevelBadge";
import { useNavigate } from "react-router-dom";

interface RecommendedProfessional {
  professional_id: string;
  professional_name: string;
  professional_photo: string | null;
  professional_position: string | null;
  professional_company: string | null;
  professional_points: number;
  chapter_name: string | null;
  chapter_city: string | null;
  specialization_name: string | null;
}

interface CrossChapterRecommendationProps {
  specializationId?: number | null;
  professionSpecializationId?: number | null;
  excludeChapterId?: string | null;
  searchTerm?: string;
}

export const CrossChapterRecommendation = ({
  specializationId,
  professionSpecializationId,
  excludeChapterId,
  searchTerm,
}: CrossChapterRecommendationProps) => {
  const [recommendations, setRecommendations] = useState<RecommendedProfessional[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!specializationId && !professionSpecializationId) return;

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("find_top_professionals_by_specialization", {
        p_specialization_id: specializationId || null,
        p_profession_specialization_id: professionSpecializationId || null,
        p_exclude_chapter_id: excludeChapterId || null,
      });

      if (!error && data) {
        setRecommendations(data as RecommendedProfessional[]);
      }
      setLoading(false);
    };
    fetch();
  }, [specializationId, professionSpecializationId, excludeChapterId]);

  if (loading || recommendations.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          Recomendados de otras zonas
        </CardTitle>
        <CardDescription>
          {searchTerm
            ? `Los mejores profesionales de "${searchTerm}" fuera de tu capítulo`
            : "Top profesionales de cada capítulo por puntuación"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div
            key={rec.professional_id}
            className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
          >
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={rec.professional_photo || undefined} />
                <AvatarFallback>
                  {rec.professional_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              {idx === 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Trophy className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{rec.professional_name}</h4>
              {rec.professional_position && (
                <p className="text-sm text-muted-foreground truncate">
                  {rec.professional_position}
                  {rec.professional_company && ` • ${rec.professional_company}`}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {rec.chapter_city && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    Top de {rec.chapter_city}
                  </Badge>
                )}
                {rec.specialization_name && (
                  <Badge variant="secondary" className="text-xs">
                    {rec.specialization_name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="font-bold text-lg">{rec.professional_points}</p>
              <PointsLevelBadge points={rec.professional_points} size="sm" />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/meetings")}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
