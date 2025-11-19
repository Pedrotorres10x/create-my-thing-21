import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, UserPlus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface Specialization {
  id: number;
  name: string;
  covered: boolean;
  professionalName?: string;
  professionalId?: string;
}

interface SpecializationMapProps {
  sphereId: number;
  chapterId: string | null;
}

export const SpecializationMap = ({ sphereId, chapterId }: SpecializationMapProps) => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSpecializations();
  }, [sphereId, chapterId]);

  const loadSpecializations = async () => {
    try {
      // Get all specializations linked to this sphere
      const { data: sphereSpecs } = await supabase
        .from("sphere_specializations")
        .select(`
          specialization_id,
          specializations!inner (
            id,
            name
          )
        `)
        .eq("business_sphere_id", sphereId);

      if (!sphereSpecs) {
        setLoading(false);
        return;
      }

      // Get profession specializations for each
      const specializationIds = sphereSpecs.map(s => s.specialization_id);
      
      const { data: profSpecs } = await supabase
        .from("profession_specializations")
        .select("id, name, specialization_id")
        .in("specialization_id", specializationIds);

      // Check which are covered in this chapter
      let coveredQuery = supabase
        .from("professionals")
        .select("profession_specialization_id, full_name, id")
        .eq("business_sphere_id", sphereId)
        .eq("status", "approved")
        .not("profession_specialization_id", "is", null);

      if (chapterId) {
        coveredQuery = coveredQuery.eq("chapter_id", chapterId);
      }

      const { data: covered } = await coveredQuery;

      const coveredMap = new Map(
        covered?.map(p => [
          p.profession_specialization_id,
          { name: p.full_name, id: p.id }
        ])
      );

      const specs: Specialization[] = (profSpecs || []).map(ps => ({
        id: ps.id,
        name: ps.name,
        covered: coveredMap.has(ps.id),
        professionalName: coveredMap.get(ps.id)?.name,
        professionalId: coveredMap.get(ps.id)?.id
      }));

      setSpecializations(specs);
    } catch (error) {
      console.error("Error loading specializations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const coveredCount = specializations.filter(s => s.covered).length;
  const totalCount = specializations.length;
  const completionPercentage = totalCount > 0 ? (coveredCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mapa de Especialidades</span>
          <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
            {coveredCount}/{totalCount} Cubiertas
          </Badge>
        </CardTitle>
        <div className="space-y-2 pt-2">
          <Progress value={completionPercentage} className="h-2" />
          <p className="text-sm text-muted-foreground">
            Completitud de tu esfera: {completionPercentage.toFixed(0)}%
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {specializations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay especialidades configuradas para esta esfera.
          </p>
        ) : (
          <div className="space-y-3">
            {specializations.map((spec) => (
              <div
                key={spec.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {spec.covered ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{spec.name}</p>
                    {spec.covered && spec.professionalName ? (
                      <p className="text-sm text-muted-foreground">
                        <Users className="h-3 w-3 inline mr-1" />
                        {spec.professionalName}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Disponible</p>
                    )}
                  </div>
                </div>

                {spec.covered && spec.professionalId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/professionals/${spec.professionalId}`)}
                  >
                    Ver Perfil
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate("/referrals")}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Invitar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
