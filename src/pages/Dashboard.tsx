import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, TrendingUp, Users, Trophy } from "lucide-react";
import { LevelBadge } from "@/components/LevelBadge";

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

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Get professional data
        const { data: professional } = await supabase
          .from("professionals")
          .select("id, total_points")
          .eq("user_id", user.id)
          .single();

        if (!professional) {
          setLoading(false);
          return;
        }

        // Get referrals statistics
        const { data: referrals } = await supabase
          .from("referrals")
          .select("status")
          .eq("referrer_id", professional.id);

        const referralsSent = referrals?.length || 0;
        const referralsCompleted = referrals?.filter(r => r.status === "completed").length || 0;

        // Get level information
        const { data: level } = await supabase
          .from("point_levels")
          .select("name, badge_color, min_points, max_points")
          .lte("min_points", professional.total_points)
          .order("min_points", { ascending: false })
          .limit(1)
          .single();

        // Get ranking (count how many professionals have more points)
        const { count } = await supabase
          .from("professionals")
          .select("*", { count: "exact", head: true })
          .gt("total_points", professional.total_points);

        const ranking = (count || 0) + 1;

        setStats({
          referralsSent,
          referralsCompleted,
          totalPoints: professional.total_points,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenido a CONECTOR</p>
        </div>
        <LevelBadge 
          level={stats.level.name} 
          color={stats.level.color} 
          size="lg"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referidos Enviados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.referralsSent}</div>
            <p className="text-xs text-muted-foreground">Total de referidos que has enviado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referidos Completados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.referralsCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {stats.referralsSent > 0 
                ? `${Math.round((stats.referralsCompleted / stats.referralsSent) * 100)}% de conversión`
                : "0% de conversión"
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
                ? `${nextLevelPoints} puntos para el siguiente nivel`
                : "Nivel máximo alcanzado"
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tu Ranking</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{stats.ranking}</div>
            <p className="text-xs text-muted-foreground">Posición en el ranking general</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar for next level */}
      {stats.level.maxPoints && (
        <Card>
          <CardHeader>
            <CardTitle>Progreso hacia {stats.level.maxPoints < 1000 ? "el próximo nivel" : "nivel Diamante"}</CardTitle>
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
    </div>
  );
};

export default Dashboard;
