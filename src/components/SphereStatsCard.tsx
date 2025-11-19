import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface SphereStatsCardProps {
  sphereId: number;
  sphereName: string;
  sphereIcon?: string;
  sphereColor?: string;
  chapterId?: string;
}

export const SphereStatsCard = ({
  sphereId,
  sphereName,
  sphereIcon = "Circle",
  sphereColor = "hsl(var(--primary))",
  chapterId
}: SphereStatsCardProps) => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    chapterMembers: 0,
    loading: true
  });

  useEffect(() => {
    loadStats();
  }, [sphereId, chapterId]);

  const loadStats = async () => {
    try {
      // Total members in sphere
      const { count: totalCount } = await supabase
        .from("professionals")
        .select("*", { count: "exact", head: true })
        .eq("business_sphere_id", sphereId)
        .eq("status", "approved");

      // Members in same chapter
      let chapterCount = 0;
      if (chapterId) {
        const { count } = await supabase
          .from("professionals")
          .select("*", { count: "exact", head: true })
          .eq("business_sphere_id", sphereId)
          .eq("chapter_id", chapterId)
          .eq("status", "approved");
        
        chapterCount = count || 0;
      }

      setStats({
        totalMembers: totalCount || 0,
        chapterMembers: chapterCount,
        loading: false
      });
    } catch (error) {
      console.error("Error loading sphere stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const IconComponent = (LucideIcons as any)[sphereIcon] || LucideIcons.Circle;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <IconComponent 
            className="h-5 w-5" 
            style={{ color: sphereColor }}
          />
          Tu Esfera: {sphereName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Miembros totales</span>
            </div>
            <span className="text-2xl font-bold">{stats.totalMembers}</span>
          </div>

          {chapterId && stats.chapterMembers > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">En tu capítulo</span>
              </div>
              <span className="text-xl font-semibold">{stats.chapterMembers}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-2">
            Conecta con profesionales complementarios de tu esfera para ampliar tu red de negocio
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
