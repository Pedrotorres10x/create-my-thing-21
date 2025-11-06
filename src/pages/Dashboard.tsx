import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, Users, Trophy, Calendar, Store, MessageSquare, Handshake, ArrowRight, UserCircle } from "lucide-react";
import { LevelBadge } from "@/components/LevelBadge";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
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

  const quickActions = [
    {
      title: "Mi Perfil",
      description: "Gestiona tu información profesional",
      icon: UserCircle,
      action: () => navigate("/profile"),
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Referidos",
      description: "Invita profesionales y gana puntos",
      icon: Handshake,
      action: () => navigate("/referrals"),
      color: "from-green-500 to-green-600"
    },
    {
      title: "Mi Capítulo",
      description: "Conecta con tu capítulo local",
      icon: Users,
      action: () => navigate("/chapter"),
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "One-to-Ones",
      description: "Agenda reuniones con miembros",
      icon: Calendar,
      action: () => navigate("/meetings"),
      color: "from-orange-500 to-orange-600"
    },
    {
      title: "Marketplace",
      description: "Ofrece o encuentra servicios",
      icon: Store,
      action: () => navigate("/marketplace"),
      color: "from-pink-500 to-pink-600"
    },
    {
      title: "Comunidad",
      description: "Comparte y conecta con la red",
      icon: MessageSquare,
      action: () => navigate("/feed"),
      color: "from-indigo-500 to-indigo-600"
    },
    {
      title: "Rankings",
      description: "Ve tu posición en la comunidad",
      icon: Trophy,
      action: () => navigate("/rankings"),
      color: "from-yellow-500 to-yellow-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            👋 Hola, {professional?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            ¿Qué quieres hacer hoy?
          </p>
        </div>
        <LevelBadge 
          level={stats.level.name} 
          color={stats.level.color} 
          size="lg"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/referrals")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referidos</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.referralsSent}</div>
            <p className="text-xs text-muted-foreground">
              {stats.referralsCompleted} completados
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/rankings")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tu Ranking</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{stats.ranking}</div>
            <p className="text-xs text-muted-foreground">en la comunidad</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
            <p className="text-xs text-muted-foreground">
              {nextLevelPoints !== null ? `${nextLevelPoints} al siguiente` : "Nivel máximo"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/meetings")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reuniones</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
            <p className="text-xs text-muted-foreground">próximas</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Acciones Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card 
                key={index} 
                className="group cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={action.action}
              >
                <CardHeader className="space-y-0">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="ghost" size="sm" className="w-full group-hover:bg-muted">
                    Ir ahora
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Próximas Reuniones
                </CardTitle>
                <CardDescription>Tus one-to-ones confirmados</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/meetings")}>
                Ver todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
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
            <CardTitle>Tu Progreso</CardTitle>
            <CardDescription>
              {stats.totalPoints} / {stats.level.maxPoints + 1} puntos para {stats.level.maxPoints < 1000 ? "el siguiente nivel" : "Nivel Diamante"}
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
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {nextLevelPoints !== null && `Faltan ${nextLevelPoints} puntos`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
