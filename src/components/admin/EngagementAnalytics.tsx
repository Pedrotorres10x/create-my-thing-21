import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown, Users, AlertTriangle, Activity, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface StageStats {
  stage: string;
  count: number;
  avg_score: number;
  avg_days: number;
}

interface UserActivity {
  professional_id: string;
  reengagement_stage: string;
  activity_score: number;
  inactivity_days: number;
  last_notification_sent: string | null;
  professional: {
    full_name: string;
    email: string;
    total_points: number;
  };
}

export const EngagementAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stageStats, setStageStats] = useState<StageStats[]>([]);
  const [criticalUsers, setCriticalUsers] = useState<UserActivity[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Get stage statistics
      const { data: stages } = await supabase
        .from("user_activity_tracking")
        .select("reengagement_stage, activity_score, inactivity_days");

      if (stages) {
        const statsMap = new Map<string, { count: number; totalScore: number; totalDays: number }>();
        
        stages.forEach(s => {
          const stage = s.reengagement_stage || "active";
          const current = statsMap.get(stage) || { count: 0, totalScore: 0, totalDays: 0 };
          statsMap.set(stage, {
            count: current.count + 1,
            totalScore: current.totalScore + (s.activity_score || 0),
            totalDays: current.totalDays + (s.inactivity_days || 0)
          });
        });

        const stats = Array.from(statsMap.entries()).map(([stage, data]) => ({
          stage,
          count: data.count,
          avg_score: Math.round(data.totalScore / data.count),
          avg_days: Math.round(data.totalDays / data.count)
        }));

        setStageStats(stats);
        setTotalUsers(stages.length);
      }

      // Get critical users (dormant and inactive)
      const { data: critical } = await supabase
        .from("user_activity_tracking")
        .select(`
          professional_id,
          reengagement_stage,
          activity_score,
          inactivity_days,
          last_notification_sent,
          professionals (
            full_name,
            email,
            total_points
          )
        `)
        .in("reengagement_stage", ["dormant", "inactive"])
        .order("inactivity_days", { ascending: false })
        .limit(20);

      if (critical) {
        setCriticalUsers(critical.map(u => ({
          ...u,
          professional: u.professionals as any
        })));
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las analíticas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const getStageIcon = (stage: string) => {
    switch(stage) {
      case "active": return <Activity className="h-5 w-5 text-green-500" />;
      case "at_risk": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "inactive": return <TrendingDown className="h-5 w-5 text-orange-500" />;
      case "dormant": return <Users className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getStageBadgeVariant = (stage: string): "default" | "secondary" | "destructive" | "outline" => {
    switch(stage) {
      case "active": return "default";
      case "at_risk": return "secondary";
      case "inactive": return "outline";
      case "dormant": return "destructive";
      default: return "outline";
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      active: "Activos",
      at_risk: "En Riesgo",
      inactive: "Inactivos",
      dormant: "Dormant"
    };
    return labels[stage] || stage;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const activeCount = stageStats.find(s => s.stage === "active")?.count || 0;
  const atRiskCount = stageStats.find(s => s.stage === "at_risk")?.count || 0;
  const inactiveCount = stageStats.find(s => s.stage === "inactive")?.count || 0;
  const dormantCount = stageStats.find(s => s.stage === "dormant")?.count || 0;
  
  const healthScore = totalUsers > 0 
    ? Math.round(((activeCount + atRiskCount * 0.5) / totalUsers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalUsers > 0 ? Math.round((activeCount/totalUsers)*100) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              En Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{atRiskCount}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              Inactivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCount}</div>
            <p className="text-xs text-muted-foreground">7-30 días sin actividad</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-red-500" />
              Dormant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dormantCount}</div>
            <p className="text-xs text-muted-foreground">+30 días sin actividad</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Health Score de la Comunidad
            </span>
          </CardTitle>
          <CardDescription>
            Score general de engagement de todos los usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Score Actual</span>
              <span className="text-2xl font-bold">{healthScore}%</span>
            </div>
            <Progress value={healthScore} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {healthScore >= 70 ? "✅ Excelente salud de la comunidad" :
               healthScore >= 50 ? "⚠️ Salud moderada, mejorar engagement" :
               "🚨 Alerta: Baja actividad general"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <Tabs defaultValue="stages" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stages">Por Etapas</TabsTrigger>
          <TabsTrigger value="critical">Usuarios Críticos</TabsTrigger>
        </TabsList>

        <TabsContent value="stages" className="space-y-4">
          {stageStats.map(stat => (
            <Card key={stat.stage}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStageIcon(stat.stage)}
                    {getStageLabel(stat.stage)}
                  </div>
                  <Badge variant={getStageBadgeVariant(stat.stage)}>
                    {stat.count} usuarios
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Score Promedio</p>
                    <p className="text-xl font-bold">{stat.avg_score}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Días Promedio</p>
                    <p className="text-xl font-bold">{stat.avg_days}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">% del Total</p>
                    <p className="text-xl font-bold">
                      {totalUsers > 0 ? Math.round((stat.count/totalUsers)*100) : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          {criticalUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay usuarios en estado crítico
              </CardContent>
            </Card>
          ) : (
            criticalUsers.map(user => (
              <Card key={user.professional_id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{user.professional.full_name}</p>
                        <Badge variant={getStageBadgeVariant(user.reengagement_stage)}>
                          {getStageLabel(user.reengagement_stage)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.professional.email}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                        <span>Score: {user.activity_score}/100</span>
                        <span>Inactivo: {user.inactivity_days} días</span>
                        <span>Puntos: {user.professional.total_points}</span>
                      </div>
                      {user.last_notification_sent && (
                        <p className="text-xs text-muted-foreground">
                          Última notificación: {new Date(user.last_notification_sent).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
