import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, TrendingUp, TrendingDown, AlertTriangle, 
  Heart, UserX, RotateCcw, Rocket, Crown, 
  Activity, Users, RefreshCw, BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmotionalStateStats {
  state: string;
  count: number;
  avgRetention: number;
  avgTrust: number;
  avgEbs: number;
}

interface UserEmotionalData {
  id: string;
  professional_id: string;
  emotional_state: string;
  days_since_last_activity: number;
  activity_quality_score: number;
  energy_trend: string;
  state_changed_at: string;
  professional: {
    full_name: string;
    email: string;
    total_points: number;
  };
  metrics?: {
    emotional_bond_score: number;
    trust_index: number;
    retention_probability: number;
  };
}

interface MessageStats {
  total_sent: number;
  read_rate: number;
  dismissed_rate: number;
}

interface RewardStats {
  total_granted: number;
  claimed_rate: number;
  active_count: number;
}

const STATE_CONFIG: Record<string, { label: string; icon: any; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  active_inspired: { label: "Inspirado", icon: Zap, color: "text-yellow-500", badgeVariant: "default" },
  active_constant: { label: "Constante", icon: TrendingUp, color: "text-green-500", badgeVariant: "default" },
  active_at_risk: { label: "En Riesgo", icon: AlertTriangle, color: "text-orange-500", badgeVariant: "secondary" },
  disconnected_light: { label: "Desconectado Leve", icon: Heart, color: "text-gray-500", badgeVariant: "outline" },
  disconnected_critical: { label: "Desconectado Crítico", icon: UserX, color: "text-red-500", badgeVariant: "destructive" },
  returning: { label: "Regresando", icon: RotateCcw, color: "text-blue-500", badgeVariant: "default" },
  accelerated_growth: { label: "Crecimiento Acelerado", icon: Rocket, color: "text-purple-500", badgeVariant: "default" },
  top_performer: { label: "Top Performer", icon: Crown, color: "text-amber-500", badgeVariant: "default" },
};

export const LovableEmotionalDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [stateStats, setStateStats] = useState<EmotionalStateStats[]>([]);
  const [usersAtRisk, setUsersAtRisk] = useState<UserEmotionalData[]>([]);
  const [messageStats, setMessageStats] = useState<MessageStats>({ total_sent: 0, read_rate: 0, dismissed_rate: 0 });
  const [rewardStats, setRewardStats] = useState<RewardStats>({ total_granted: 0, claimed_rate: 0, active_count: 0 });
  const [totalUsers, setTotalUsers] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get emotional states with metrics
      const { data: emotionalStates } = await supabase
        .from("user_emotional_states")
        .select(`
          *,
          professionals (full_name, email, total_points)
        `);

      const { data: metrics } = await supabase
        .from("user_emotional_metrics")
        .select("*");

      if (emotionalStates) {
        // Calculate stats per state
        const statsMap = new Map<string, { count: number; totalRetention: number; totalTrust: number; totalEbs: number }>();
        
        emotionalStates.forEach(s => {
          const state = s.emotional_state || "active_constant";
          const userMetrics = metrics?.find(m => m.professional_id === s.professional_id);
          const current = statsMap.get(state) || { count: 0, totalRetention: 0, totalTrust: 0, totalEbs: 0 };
          statsMap.set(state, {
            count: current.count + 1,
            totalRetention: current.totalRetention + (userMetrics?.retention_probability || 50),
            totalTrust: current.totalTrust + (userMetrics?.trust_index || 50),
            totalEbs: current.totalEbs + (userMetrics?.emotional_bond_score || 50),
          });
        });

        const stats = Array.from(statsMap.entries()).map(([state, data]) => ({
          state,
          count: data.count,
          avgRetention: Math.round(data.totalRetention / data.count),
          avgTrust: Math.round(data.totalTrust / data.count),
          avgEbs: Math.round(data.totalEbs / data.count),
        }));

        // Sort by priority (critical states first)
        const priorityOrder = ['disconnected_critical', 'disconnected_light', 'active_at_risk', 'returning', 'active_constant', 'active_inspired', 'accelerated_growth', 'top_performer'];
        stats.sort((a, b) => priorityOrder.indexOf(a.state) - priorityOrder.indexOf(b.state));

        setStateStats(stats);
        setTotalUsers(emotionalStates.length);

        // Get users at risk (critical and at_risk states)
        const atRiskUsers = emotionalStates
          .filter(s => ['disconnected_critical', 'disconnected_light', 'active_at_risk'].includes(s.emotional_state))
          .map(s => ({
            ...s,
            professional: s.professionals as any,
            metrics: metrics?.find(m => m.professional_id === s.professional_id),
          }))
          .sort((a, b) => (a.metrics?.retention_probability || 50) - (b.metrics?.retention_probability || 50))
          .slice(0, 20);

        setUsersAtRisk(atRiskUsers);
      }

      // Get message statistics
      const { data: messages } = await supabase
        .from("lovable_messages")
        .select("is_read, is_dismissed");

      if (messages && messages.length > 0) {
        const readCount = messages.filter(m => m.is_read).length;
        const dismissedCount = messages.filter(m => m.is_dismissed).length;
        setMessageStats({
          total_sent: messages.length,
          read_rate: Math.round((readCount / messages.length) * 100),
          dismissed_rate: Math.round((dismissedCount / messages.length) * 100),
        });
      }

      // Get reward statistics
      const { data: rewards } = await supabase
        .from("user_micro_rewards")
        .select("status");

      if (rewards && rewards.length > 0) {
        const claimedCount = rewards.filter(r => r.status === "claimed").length;
        const activeCount = rewards.filter(r => r.status === "active").length;
        setRewardStats({
          total_granted: rewards.length,
          claimed_rate: Math.round((claimedCount / rewards.length) * 100),
          active_count: activeCount,
        });
      }
    } catch (error) {
      console.error("Error loading LOVABLE dashboard:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runLovableAlgorithm = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("lovable-algorithm", {
        body: { mode: "full" }
      });
      
      if (error) throw error;

      toast({
        title: "✅ Algoritmo ejecutado",
        description: `Procesados ${data.processed || 0} usuarios`
      });

      loadDashboardData();
    } catch (error) {
      console.error("Error running LOVABLE algorithm:", error);
      toast({
        title: "Error",
        description: "No se pudo ejecutar el algoritmo LOVABLE",
        variant: "destructive"
      });
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Calculate health metrics
  const positiveStates = ['active_inspired', 'active_constant', 'accelerated_growth', 'top_performer', 'returning'];
  const positiveCount = stateStats.filter(s => positiveStates.includes(s.state)).reduce((acc, s) => acc + s.count, 0);
  const healthScore = totalUsers > 0 ? Math.round((positiveCount / totalUsers) * 100) : 0;
  
  const criticalCount = stateStats.find(s => s.state === 'disconnected_critical')?.count || 0;
  const atRiskCount = stateStats.find(s => s.state === 'active_at_risk')?.count || 0;
  const abandonmentRisk = totalUsers > 0 ? Math.round(((criticalCount * 0.9 + atRiskCount * 0.3) / totalUsers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header with Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500" />
            Motor LOVABLE
          </h2>
          <p className="text-muted-foreground">Dashboard de estados emocionales</p>
        </div>
        <Button onClick={runLovableAlgorithm} disabled={running}>
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
          {running ? "Ejecutando..." : "Ejecutar Algoritmo"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthScore}%</div>
            <Progress value={healthScore} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {healthScore >= 70 ? "Excelente" : healthScore >= 50 ? "Moderado" : "Crítico"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Riesgo Abandono
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{abandonmentRisk}%</div>
            <p className="text-xs text-muted-foreground">
              {criticalCount} críticos, {atRiskCount} en riesgo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Mensajes LOVABLE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.total_sent}</div>
            <p className="text-xs text-muted-foreground">
              {messageStats.read_rate}% leídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Recompensas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rewardStats.active_count}</div>
            <p className="text-xs text-muted-foreground">
              Activas ({rewardStats.claimed_rate}% reclamadas)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="states" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="states">Estados Emocionales</TabsTrigger>
          <TabsTrigger value="critical">Usuarios en Riesgo</TabsTrigger>
          <TabsTrigger value="metrics">Métricas LOVABLE</TabsTrigger>
        </TabsList>

        {/* States Tab */}
        <TabsContent value="states" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stateStats.map(stat => {
              const config = STATE_CONFIG[stat.state] || STATE_CONFIG.active_constant;
              const Icon = config.icon;
              return (
                <Card key={stat.state}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${config.color}`} />
                        {config.label}
                      </div>
                      <Badge variant={config.badgeVariant}>
                        {stat.count} usuarios
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">EBS</p>
                        <p className="text-lg font-bold">{stat.avgEbs}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Trust</p>
                        <p className="text-lg font-bold">{stat.avgTrust}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Retención</p>
                        <p className="text-lg font-bold">{stat.avgRetention}%</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>% del total</span>
                        <span>{totalUsers > 0 ? Math.round((stat.count / totalUsers) * 100) : 0}%</span>
                      </div>
                      <Progress value={totalUsers > 0 ? (stat.count / totalUsers) * 100 : 0} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Critical Users Tab */}
        <TabsContent value="critical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Usuarios con Mayor Riesgo de Abandono
              </CardTitle>
              <CardDescription>
                Ordenados por menor probabilidad de retención
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {usersAtRisk.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay usuarios en estado crítico
                  </div>
                ) : (
                  <div className="space-y-3">
                    {usersAtRisk.map(user => {
                      const config = STATE_CONFIG[user.emotional_state] || STATE_CONFIG.active_constant;
                      const Icon = config.icon;
                      return (
                        <div key={user.id} className="flex items-start justify-between p-3 rounded-lg border">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${config.color}`} />
                              <p className="font-semibold">{user.professional?.full_name}</p>
                              <Badge variant={config.badgeVariant} className="text-xs">
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{user.professional?.email}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                              <span>Inactivo: {user.days_since_last_activity} días</span>
                              <span>Score: {user.activity_quality_score}</span>
                              <span className={user.energy_trend === 'falling' ? 'text-red-500' : ''}>
                                Tendencia: {user.energy_trend}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-500">
                              {user.metrics?.retention_probability || 50}%
                            </div>
                            <p className="text-xs text-muted-foreground">Retención</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Efectividad de Mensajes</CardTitle>
                <CardDescription>Impacto de los mensajes LOVABLE</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Tasa de Lectura</span>
                    <span className="font-bold">{messageStats.read_rate}%</span>
                  </div>
                  <Progress value={messageStats.read_rate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Tasa de Descarte</span>
                    <span className="font-bold">{messageStats.dismissed_rate}%</span>
                  </div>
                  <Progress value={messageStats.dismissed_rate} className="h-2" />
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Total mensajes enviados: <strong>{messageStats.total_sent}</strong>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Efectividad de Recompensas</CardTitle>
                <CardDescription>Impacto de las micro-recompensas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Tasa de Reclamación</span>
                    <span className="font-bold">{rewardStats.claimed_rate}%</span>
                  </div>
                  <Progress value={rewardStats.claimed_rate} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Otorgadas</p>
                    <p className="text-xl font-bold">{rewardStats.total_granted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Activas Ahora</p>
                    <p className="text-xl font-bold">{rewardStats.active_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
