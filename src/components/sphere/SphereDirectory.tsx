import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, Calendar, Eye, Briefcase, Award, Flag } from "lucide-react";
import { ReportUserDialog } from "@/components/ReportUserDialog";
import { useNavigate } from "react-router-dom";
import { PointsLevelBadge } from "@/components/PointsLevelBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { SphereSearch, SearchFilters } from "./SphereSearch";
import { CrossChapterRecommendation } from "./CrossChapterRecommendation";

interface Professional {
  id: string;
  full_name: string;
  business_name: string | null;
  photo_url: string | null;
  total_points: number;
  years_experience: number | null;
  profession_specializations: {
    name: string;
  } | null;
}

interface SphereDirectoryProps {
  sphereId: number;
  chapterId: string | null;
  chapterIds?: string[] | null;
}

export const SphereDirectory = ({ sphereId, chapterId, chapterIds }: SphereDirectoryProps) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([]);
  const [specializations, setSpecializations] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({ query: "", specializationId: null });
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentProfessionalId, setCurrentProfessionalId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCurrentProf = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("professionals").select("id").eq("user_id", user.id).single();
        if (data) setCurrentProfessionalId(data.id);
      }
    };
    loadCurrentProf();
  }, []);

  useEffect(() => {
    loadProfessionals();
    loadSpecializations();
  }, [sphereId, chapterId, chapterIds]);

  useEffect(() => {
    setFilteredProfessionals(professionals);
  }, [professionals]);

  const loadSpecializations = async () => {
    try {
      const { data } = await supabase
        .from("profession_specializations")
        .select("id, name")
        .order("name");
      
      setSpecializations(data || []);
    } catch (error) {
      console.error("Error loading specializations:", error);
    }
  };

  const loadProfessionals = async () => {
    try {
      let query = supabase
        .from("professionals_public")
        .select(`
          id,
          full_name,
          business_name,
          photo_url,
          total_points,
          years_experience,
          profession_specializations (
            name
          )
        `)
        .eq("business_sphere_id", sphereId)
        .order("total_points", { ascending: false });

      // Use chapterIds array if provided, otherwise fall back to single chapterId
      if (chapterIds && chapterIds.length > 0) {
        query = query.in("chapter_id", chapterIds);
      } else if (chapterIds === null) {
        // null means no filter (show all)
      } else if (chapterId) {
        query = query.eq("chapter_id", chapterId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error("Error loading professionals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters: SearchFilters) => {
    setActiveFilters(filters);
    let filtered = [...professionals];

    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(p => 
        p.full_name.toLowerCase().includes(query) ||
        p.business_name?.toLowerCase().includes(query) ||
        p.profession_specializations?.name.toLowerCase().includes(query)
      );
    }

    if (filters.specializationId) {
      filtered = filtered.filter(p => 
        p.profession_specializations?.name === specializations.find(s => s.id === filters.specializationId)?.name
      );
    }

    setFilteredProfessionals(filtered);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      <SphereSearch 
        onSearch={handleSearch}
        specializations={specializations}
      />

      {professionals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No hay profesionales en tu esfera en este capítulo todavía.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredProfessionals.length} de {professionals.length} profesional{professionals.length !== 1 ? "es" : ""}
            </p>
          </div>

          {filteredProfessionals.length === 0 ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No se encontraron profesionales con los filtros seleccionados.
                  </p>
                </CardContent>
              </Card>
              {activeFilters.specializationId && (
                <CrossChapterRecommendation
                  professionSpecializationId={activeFilters.specializationId}
                  excludeChapterId={chapterId}
                  searchTerm={activeFilters.query || specializations.find(s => s.id === activeFilters.specializationId)?.name}
                />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfessionals.map((professional) => (
          <Card key={professional.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={professional.photo_url || ""} />
                  <AvatarFallback className="text-2xl">
                    {professional.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-2 w-full">
                  <h3 className="font-semibold text-lg">{professional.full_name}</h3>
                  
                  {professional.profession_specializations && (
                    <Badge variant="secondary" className="text-xs">
                      {professional.profession_specializations.name}
                    </Badge>
                  )}

                  {professional.business_name && (
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <Briefcase className="h-3 w-3" />
                      <span>{professional.business_name}</span>
                    </div>
                  )}

                  {professional.years_experience && (
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <Award className="h-3 w-3" />
                      <span>{professional.years_experience} años exp.</span>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <PointsLevelBadge points={professional.total_points} size="sm" />
                  </div>
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/profesional/${professional.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/meetings`)}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Reunión
                  </Button>
                  {currentProfessionalId && currentProfessionalId !== professional.id && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/recomendacion?to=${professional.id}`)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Referir
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
              </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>

      {currentProfessionalId && reportTarget && (
        <ReportUserDialog
          open={!!reportTarget}
          onOpenChange={(open) => !open && setReportTarget(null)}
          reportedId={reportTarget.id}
          reportedName={reportTarget.name}
          context="sphere_directory"
          reporterId={currentProfessionalId}
        />
      )}
    </>
  );
};
