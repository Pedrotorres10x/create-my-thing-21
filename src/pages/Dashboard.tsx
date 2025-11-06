import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, Users, Trophy, Calendar, Activity, BarChart3, Target } from "lucide-react";
import { LevelBadge } from "@/components/LevelBadge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardStats {
  referralsSent: number;
  referralsCompleted: number;
  totalPoints: number;
  ranking: number;
  level: {
    name: string;
    color: string;
    minPoints: number;
    maxPoints: number | null;
  };
}

interface RecentActivity {
  id: string;
  type: 'referral' | 'meeting' | 'post' | 'offer';
  description: string;
  created_at: string;
}

interface UpcomingMeeting {
  id: string;
  meeting_date: string;
  meeting_type: string;
  recipient: { full_name: string };
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [professional, setProfessional] = useState<any>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Get professional data
        const { data: professionalData } = await supabase
          .from("professionals")
          .select("id, total_points, full_name, status")
          .eq("user_id", user.id)
          .single();

        if (!professionalData) {
          setLoading(false);
          return;
        }

        setProfessional(professionalData);

        // Get referrals statistics
        const { data: referrals } = await supabase
          .from("referrals")
          .select("status, created_at")
          .eq("referrer_id", professionalData.id);

        const referralsSent = referrals?.length || 0;
        const referralsCompleted = referrals?.filter(r => r.status === "completed").length || 0;

        // Get level information
        const { data: level } = await supabase
          .from("point_levels")
          .select("name, badge_color, min_points, max_points")
          .lte("min_points", professionalData.total_points)
          .order("min_points", { ascending: false })
          .limit(1)
          .single();

        // Get ranking (count how many professionals have more points)
        const { count } = await supabase
          .from("professionals")
          .select("*", { count: "exact", head: true })
          .gt("total_points", professionalData.total_points);

        const ranking = (count || 0) + 1;

        // Get upcoming meetings
        const { data: meetings } = await supabase
          .from("meetings")
          .select(`
            id,
            meeting_date,
            meeting_type,
            professionals!meetings_recipient_id_fkey (full_name)
          `)
          .eq("requester_id", professionalData.id)
          .eq("status", "confirmed")
          .gte("meeting_date", new Date().toISOString())
          .order("meeting_date", { ascending: true })
          .limit(3);

        setUpcomingMeetings((meetings || []).map(m => ({
          ...m,
          recipient: m.professionals
        })) as any);

        // Build recent activity
        const activities: RecentActivity[] = [];

        // Add recent referrals
        referrals?.slice(0, 3).forEach(ref => {
          activities.push({
            id: crypto.randomUUID(),
            type: 'referral',
            description: `Enviaste un referido`,
            created_at: ref.created_at
          });
        });

        // Sort by date
        activities.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setRecentActivity(activities.slice(0, 5));

        setStats({
          referralsSent,
          referralsCompleted,
          totalPoints: professionalData.total_points,
          ranking,
          level: {
            name: level?.name || "Bronce",
            color: level?.badge_color || "#CD7F32",
            minPoints: level?.min_points || 0,
            maxPoints: level?.max_points,
          },
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenido a CONECTOR</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Completa tu perfil profesional para ver tus estadísticas</p>
        </div>
      </div>
    );
  }

  const nextLevelPoints = stats.level.maxPoints 
    ? stats.level.maxPoints + 1 - stats.totalPoints 
    : null;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'referral': return Users;
      case 'meeting': return Calendar;
      case 'post': return Activity;
      case 'offer': return TrendingUp;
      default: return Activity;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido de vuelta, {professional?.full_name}
          </p>
        </div>
        <LevelBadge 
          level={stats.level.name} 
          color={stats.level.color} 
          size="lg"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Target className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Actividad
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Referidos Enviados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.referralsSent}</div>
                <p className="text-xs text-muted-foreground">Total enviados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.referralsCompleted}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.referralsSent > 0 
                    ? `${Math.round((stats.referralsCompleted / stats.referralsSent) * 100)}% conversión`
                    : "0% conversión"
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Puntos Totales</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPoints}</div>
                <p className="text-xs text-muted-foreground">
                  {nextLevelPoints !== null 
                    ? `${nextLevelPoints} al siguiente nivel`
                    : "Nivel máximo"
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ranking</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">#{stats.ranking}</div>
                <p className="text-xs text-muted-foreground">Posición general</p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Próximas Reuniones
                </CardTitle>
                <CardDescription>Tus one-to-ones confirmados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{meeting.recipient.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(meeting.meeting_date), {
                            addSuffix: true,
                            locale: es
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary">{meeting.meeting_type}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress bar */}
          {stats.level.maxPoints && (
            <Card>
              <CardHeader>
                <CardTitle>Progreso hacia {stats.level.maxPoints < 1000 ? "el Siguiente Nivel" : "Nivel Diamante"}</CardTitle>
                <CardDescription>
                  {stats.totalPoints} / {stats.level.maxPoints + 1} puntos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-secondary rounded-full h-4">
                  <div
                    className="h-4 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((stats.totalPoints / (stats.level.maxPoints + 1)) * 100, 100)}%`,
                      backgroundColor: stats.level.color,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Tus últimas acciones en la plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay actividad reciente
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), {
                              addSuffix: true,
                              locale: es
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Referidos</CardTitle>
                <CardDescription>Desglose de tus referidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Enviados</span>
                  <Badge variant="secondary">{stats.referralsSent}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completados</span>
                  <Badge>{stats.referralsCompleted}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pendientes</span>
                  <Badge variant="outline">{stats.referralsSent - stats.referralsCompleted}</Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Tasa de Conversión</span>
                  <span className="text-lg font-bold">
                    {stats.referralsSent > 0 
                      ? `${Math.round((stats.referralsCompleted / stats.referralsSent) * 100)}%`
                      : "0%"
                    }
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Puntos y Nivel</CardTitle>
                <CardDescription>Tu progresión en CONECTOR</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nivel Actual</span>
                  <Badge style={{ backgroundColor: stats.level.color }}>
                    {stats.level.name}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Puntos Totales</span>
                  <span className="text-lg font-bold">{stats.totalPoints}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ranking Global</span>
                  <Badge variant="secondary">#{stats.ranking}</Badge>
                </div>
                {nextLevelPoints !== null && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Próximo Nivel</span>
                    <span className="text-lg font-bold">{nextLevelPoints} pts</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
