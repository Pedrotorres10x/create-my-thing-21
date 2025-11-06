import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LevelBadge } from "@/components/LevelBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Award } from "lucide-react";

interface ProfileProgressData {
  totalPoints: number;
  level: {
    name: string;
    color: string;
    minPoints: number;
    maxPoints: number | null;
  };
  referralsTotal: number;
  referralsCompleted: number;
}

export const ProfileProgress = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ProfileProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgressData = async () => {
      if (!user) return;

      try {
        const { data: professional } = await supabase
          .from("professionals")
          .select("id, total_points")
          .eq("user_id", user.id)
          .single();

        if (!professional) {
          setLoading(false);
          return;
        }

        const { data: level } = await supabase
          .from("point_levels")
          .select("name, badge_color, min_points, max_points")
          .lte("min_points", professional.total_points)
          .order("min_points", { ascending: false })
          .limit(1)
          .single();

        const { data: referrals } = await supabase
          .from("referrals")
          .select("status")
          .eq("referrer_id", professional.id);

        const referralsTotal = referrals?.length || 0;
        const referralsCompleted = referrals?.filter(r => r.status === "completed").length || 0;

        setData({
          totalPoints: professional.total_points,
          level: {
            name: level?.name || "Bronce",
            color: level?.badge_color || "#CD7F32",
            minPoints: level?.min_points || 0,
            maxPoints: level?.max_points,
          },
          referralsTotal,
          referralsCompleted,
        });
      } catch (error) {
        console.error("Error fetching progress data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const progressPercentage = data.level.maxPoints
    ? Math.min((data.totalPoints / (data.level.maxPoints + 1)) * 100, 100)
    : 100;

  const conversionRate = data.referralsTotal > 0
    ? Math.round((data.referralsCompleted / data.referralsTotal) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mi Progreso</span>
          <LevelBadge level={data.level.name} color={data.level.color} size="md" />
        </CardTitle>
        <CardDescription>
          Tu nivel actual y estadísticas de rendimiento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Points and Level Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Puntos Totales</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: data.level.color }}>
              {data.totalPoints}
            </span>
          </div>
          
          {data.level.maxPoints && (
            <>
              <div className="w-full bg-secondary rounded-full h-3 mb-2">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor: data.level.color,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {data.level.maxPoints + 1 - data.totalPoints} puntos para el siguiente nivel
              </p>
            </>
          )}
          {!data.level.maxPoints && (
            <p className="text-xs text-muted-foreground mt-2">
              🎉 ¡Has alcanzado el nivel máximo!
            </p>
          )}
        </div>

        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Referidos</span>
            </div>
            <p className="text-2xl font-bold">{data.referralsTotal}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Conversión</span>
            </div>
            <p className="text-2xl font-bold">{conversionRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
