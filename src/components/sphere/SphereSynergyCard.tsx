import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface SynergyStats {
  score: number;
  meetings: number;
  referencesSent: number;
  referencesReceived: number;
  postsRead: number;
  activeProjects: number;
}

interface SphereSynergyCardProps {
  professionalId: string;
}

export const SphereSynergyCard = ({ professionalId }: SphereSynergyCardProps) => {
  const [stats, setStats] = useState<SynergyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSynergyStats();
  }, [professionalId]);

  const loadSynergyStats = async () => {
    try {
      // Call the synergy score function
      const { data: scoreData } = await supabase.rpc(
        "calculate_sphere_synergy_score",
        { _professional_id: professionalId }
      );

      const score = scoreData || 0;

      // Get detailed stats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        meetingsResult,
        referencesSentResult,
        referencesReceivedResult,
        projectsResult
      ] = await Promise.all([
        // Meetings with sphere members
        supabase
          .from("meetings")
          .select("id", { count: "exact", head: true })
          .or(`requester_id.eq.${professionalId},recipient_id.eq.${professionalId}`)
          .in("status", ["confirmed", "completed"])
          .gte("created_at", thirtyDaysAgo.toISOString()),

        // References sent
        supabase
          .from("sphere_internal_references")
          .select("id", { count: "exact", head: true })
          .eq("referrer_id", professionalId)
          .gte("created_at", thirtyDaysAgo.toISOString()),

        // References received
        supabase
          .from("sphere_internal_references")
          .select("id", { count: "exact", head: true })
          .eq("referred_to_id", professionalId)
          .gte("created_at", thirtyDaysAgo.toISOString()),

        // Active projects
        supabase
          .from("sphere_project_participants")
          .select("id", { count: "exact", head: true })
          .eq("professional_id", professionalId)
          .eq("status", "confirmed")
      ]);

      setStats({
        score,
        meetings: meetingsResult.count || 0,
        referencesSent: referencesSentResult.count || 0,
        referencesReceived: referencesReceivedResult.count || 0,
        postsRead: Math.floor(score / 3), // Approximation
        activeProjects: projectsResult.count || 0
      });
    } catch (error) {
      console.error("Error loading synergy stats:", error);
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
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <ArrowUpRight className="h-5 w-5" />;
    if (score >= 50) return <Minus className="h-5 w-5" />;
    return <ArrowDownRight className="h-5 w-5" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excelente";
    if (score >= 50) return "Bien";
    if (score >= 30) return "Regular";
    return "Bajo";
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Índice de Sinergia</span>
          </div>
          <Badge variant={stats.score >= 80 ? "default" : "secondary"}>
            {getScoreLabel(stats.score)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex items-center ${getScoreColor(stats.score)}`}>
                {getScoreIcon(stats.score)}
                <span className="text-3xl font-bold ml-1">{stats.score}</span>
              </div>
              <span className="text-muted-foreground">/100</span>
            </div>
          </div>
          <Progress value={stats.score} className="h-3" />
          <p className="text-sm text-muted-foreground">
            Tu nivel de colaboración con tu esfera de negocio
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Reuniones</p>
            <p className="text-2xl font-bold">{stats.meetings}</p>
            <p className="text-xs text-muted-foreground">este mes</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Referencias</p>
            <p className="text-2xl font-bold">
              {stats.referencesSent + stats.referencesReceived}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.referencesSent} enviadas / {stats.referencesReceived} recibidas
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Proyectos</p>
            <p className="text-2xl font-bold">{stats.activeProjects}</p>
            <p className="text-xs text-muted-foreground">activos</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Interacción</p>
            <p className="text-2xl font-bold">{stats.postsRead}</p>
            <p className="text-xs text-muted-foreground">posts leídos</p>
          </div>
        </div>

        {stats.score < 50 && (
          <div className="bg-accent/50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">💡 Mejora tu sinergia:</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              {stats.meetings === 0 && (
                <li>Agenda reuniones con miembros de tu esfera</li>
              )}
              {stats.referencesSent === 0 && (
                <li>Envía referencias a profesionales complementarios</li>
              )}
              {stats.activeProjects === 0 && (
                <li>Únete a un proyecto colaborativo</li>
              )}
            </ul>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/mi-esfera")}
        >
          <Users className="h-4 w-4 mr-2" />
          Ver Mi Esfera
        </Button>
      </CardContent>
    </Card>
  );
};
