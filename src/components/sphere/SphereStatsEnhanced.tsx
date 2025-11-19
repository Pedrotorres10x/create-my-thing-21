import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  Target, 
  Award,
  Handshake,
  Briefcase,
  Activity
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SphereStatsEnhancedProps {
  sphereId: number;
  sphereName: string;
  chapterId?: string;
  professionalId: string;
}

interface Stats {
  totalMembers: number;
  activeProjects: number;
  pendingReferences: number;
  completedReferences: number;
  averageSynergy: number;
  specializations: {
    covered: number;
    total: number;
  };
}

export const SphereStatsEnhanced = ({
  sphereId,
  sphereName,
  chapterId,
  professionalId
}: SphereStatsEnhancedProps) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [sphereId, chapterId]);

  const loadStats = async () => {
    try {
      // Total members
      let membersQuery = supabase
        .from("professionals")
        .select("id", { count: "exact", head: true })
        .eq("business_sphere_id", sphereId)
        .eq("status", "approved");

      if (chapterId) {
        membersQuery = membersQuery.eq("chapter_id", chapterId);
      }

      const { count: totalMembers } = await membersQuery;

      // Active projects
      let projectsQuery = supabase
        .from("sphere_collaborative_projects")
        .select("id", { count: "exact", head: true })
        .eq("business_sphere_id", sphereId)
        .eq("status", "active");

      if (chapterId) {
        projectsQuery = projectsQuery.eq("chapter_id", chapterId);
      }

      const { count: activeProjects } = await projectsQuery;

      // References
      const { data: references } = await supabase
        .from("sphere_internal_references")
        .select("status")
        .eq("business_sphere_id", sphereId);

      const pendingReferences = references?.filter(r => r.status === "pending").length || 0;
      const completedReferences = references?.filter(r => r.status === "completed").length || 0;

      // Specializations coverage
      const { data: sphereSpecs } = await supabase
        .from("sphere_specializations")
        .select("specialization_id")
        .eq("business_sphere_id", sphereId);

      const totalSpecs = sphereSpecs?.length || 0;

      const { data: coveredSpecs } = await supabase
        .from("professionals")
        .select("profession_specialization_id")
        .eq("business_sphere_id", sphereId)
        .eq("status", "approved")
        .not("profession_specialization_id", "is", null);

      const uniqueCovered = new Set(coveredSpecs?.map(p => p.profession_specialization_id)).size;

      // Average synergy (simplified calculation)
      const averageSynergy = Math.min(
        100,
        Math.round(
          ((completedReferences * 10) + (activeProjects * 15) + (uniqueCovered * 5)) / 
          Math.max(1, totalMembers || 1)
        )
      );

      setStats({
        totalMembers: totalMembers || 0,
        activeProjects: activeProjects || 0,
        pendingReferences,
        completedReferences,
        averageSynergy,
        specializations: {
          covered: uniqueCovered,
          total: totalSpecs
        }
      });
    } catch (error) {
      console.error("Error loading sphere stats:", error);
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
        <CardContent className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const completionPercentage = stats.specializations.total > 0
    ? Math.round((stats.specializations.covered / stats.specializations.total) * 100)
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Estadísticas de {sphereName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Members & Synergy */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Miembros</span>
            </div>
            <div className="text-3xl font-bold">{stats.totalMembers}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Sinergia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{stats.averageSynergy}%</div>
              <Badge variant={stats.averageSynergy >= 70 ? "default" : "secondary"}>
                {stats.averageSynergy >= 70 ? "Alta" : stats.averageSynergy >= 40 ? "Media" : "Baja"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Specializations Coverage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-primary" />
              Cobertura de Especialidades
            </div>
            <span className="text-sm font-semibold">
              {stats.specializations.covered}/{stats.specializations.total}
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {completionPercentage}% de especialidades cubiertas
          </p>
        </div>

        {/* References & Projects */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Handshake className="h-3 w-3" />
              <span>Refs. Activas</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {stats.pendingReferences}
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Award className="h-3 w-3" />
              <span>Completadas</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.completedReferences}
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Briefcase className="h-3 w-3" />
              <span>Proyectos</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.activeProjects}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
