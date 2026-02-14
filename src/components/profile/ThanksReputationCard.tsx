import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface ThanksReputationCardProps {
  professionalId: string;
}

interface ReputationMetrics {
  generosityIndex: number; // 0-100
  avgSpeedHours: number | null;
  completionRate: number; // 0-100
  totalDealsCompleted: number;
}

export const ThanksReputationCard = ({ professionalId }: ThanksReputationCardProps) => {
  const [metrics, setMetrics] = useState<ReputationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [professionalId]);

  const fetchMetrics = async () => {
    try {
      // Fetch deals where this professional is the payer (receiver who closes)
      const { data: paidDeals } = await (supabase as any)
        .from("deals")
        .select("thanks_amount_selected, thanks_band_id, thanks_proposed_at, thanks_paid_at, thanks_amount_status, status, thanks_category_bands(recommended_thanks_amount)")
        .or(`referrer_id.eq.${professionalId},receiver_id.eq.${professionalId}`)
        .in("status", ["completed", "disputed"]);

      if (!paidDeals || paidDeals.length === 0) {
        setMetrics(null);
        setLoading(false);
        return;
      }

      // Generosity Index: avg(selected / recommended) * 100
      const withThanks = paidDeals.filter(
        (d: any) => d.thanks_amount_selected && d.thanks_category_bands?.recommended_thanks_amount
      );
      const generosityIndex = withThanks.length > 0
        ? Math.round(
            (withThanks.reduce((acc: number, d: any) => {
              return acc + (d.thanks_amount_selected / d.thanks_category_bands.recommended_thanks_amount);
            }, 0) / withThanks.length) * 100
          )
        : 0;

      // Speed: avg hours from proposed to paid
      const paidOnes = paidDeals.filter(
        (d: any) => d.thanks_proposed_at && d.thanks_paid_at
      );
      const avgSpeedHours = paidOnes.length > 0
        ? Math.round(
            paidOnes.reduce((acc: number, d: any) => {
              const diff = new Date(d.thanks_paid_at).getTime() - new Date(d.thanks_proposed_at).getTime();
              return acc + diff / (1000 * 60 * 60);
            }, 0) / paidOnes.length
          )
        : null;

      // Completion rate
      const completedCount = paidDeals.filter((d: any) => d.thanks_amount_status === "paid").length;
      const totalRelevant = paidDeals.filter((d: any) => d.thanks_amount_status !== "none").length;
      const completionRate = totalRelevant > 0 ? Math.round((completedCount / totalRelevant) * 100) : 0;

      setMetrics({
        generosityIndex: Math.min(generosityIndex, 200), // cap display
        avgSpeedHours,
        completionRate,
        totalDealsCompleted: paidDeals.filter((d: any) => d.status === "completed").length,
      });
    } catch (err) {
      console.error("Error fetching reputation metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Reputación</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.totalDealsCompleted === 0) {
    return null; // Don't show if no deals yet
  }

  const generosityLabel = metrics.generosityIndex >= 110
    ? "Muy generoso"
    : metrics.generosityIndex >= 95
    ? "Generoso"
    : metrics.generosityIndex >= 80
    ? "Justo"
    : "Por debajo";

  const generosityColor = metrics.generosityIndex >= 95
    ? "text-primary"
    : metrics.generosityIndex >= 80
    ? "text-muted-foreground"
    : "text-destructive";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          Reputación de Agradecimiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generosity Index */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Índice de Generosidad
            </span>
            <span className={`font-semibold ${generosityColor}`}>
              {generosityLabel}
            </span>
          </div>
          <Progress value={Math.min(metrics.generosityIndex, 100)} className="h-2" />
        </div>

        {/* Speed */}
        {metrics.avgSpeedHours !== null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Rapidez media
            </span>
            <span className="font-medium">
              {metrics.avgSpeedHours < 24
                ? `${metrics.avgSpeedHours}h`
                : `${Math.round(metrics.avgSpeedHours / 24)}d`}
            </span>
          </div>
        )}

        {/* Completion */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Cumplimiento
            </span>
            <span className="font-medium">{metrics.completionRate}%</span>
          </div>
          <Progress value={metrics.completionRate} className="h-2" />
        </div>

        <p className="text-[10px] text-muted-foreground text-center pt-1">
          Basado en {metrics.totalDealsCompleted} operaciones
        </p>
      </CardContent>
    </Card>
  );
};
