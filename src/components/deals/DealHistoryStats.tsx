import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, TrendingUp, Handshake } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DealHistoryStatsProps {
  professionalId: string;
}

interface Stats {
  totalDeals: number;
  completedDeals: number;
  conversionRate: number;
  totalVolume: number;
  rankPosition: number | null;
}

export const DealHistoryStats = ({ professionalId }: DealHistoryStatsProps) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [professionalId]);

  const fetchStats = async () => {
    try {
      // Fetch all deals where this professional is referrer or receiver
      const { data: allDeals } = await (supabase as any)
        .from("deals")
        .select("id, status, estimated_total_volume, referrer_id, receiver_id")
        .or(`referrer_id.eq.${professionalId},receiver_id.eq.${professionalId}`);

      const deals = allDeals || [];
      const total = deals.length;
      const completed = deals.filter((d: any) => d.status === "completed").length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const volume = deals
        .filter((d: any) => d.status === "completed")
        .reduce((sum: number, d: any) => sum + (d.estimated_total_volume || 0), 0);

      // Get ranking: professionals ordered by deals_completed
      const { data: ranking } = await (supabase as any)
        .from("professionals")
        .select("id, deals_completed")
        .gt("deals_completed", 0)
        .order("deals_completed", { ascending: false });

      let rank: number | null = null;
      if (ranking) {
        const idx = ranking.findIndex((p: any) => p.id === professionalId);
        if (idx >= 0) rank = idx + 1;
      }

      setStats({
        totalDeals: total,
        completedDeals: completed,
        conversionRate: rate,
        totalVolume: volume,
        rankPosition: rank,
      });
    } catch (error) {
      console.error("Error fetching deal stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Tu historial de impacto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Handshake className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.completedDeals}</p>
            <p className="text-xs text-muted-foreground">Cierres</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Ratio conversión</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.totalVolume > 0 ? `${(stats.totalVolume / 1000).toFixed(0)}k` : "—"}</p>
            <p className="text-xs text-muted-foreground">Volumen (€)</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Trophy className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats.rankPosition ? `#${stats.rankPosition}` : "—"}</p>
            <p className="text-xs text-muted-foreground">Ranking impacto</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
