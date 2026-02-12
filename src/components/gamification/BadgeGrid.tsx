import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BadgeIcon } from "./BadgeIcon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

interface BadgeGridProps {
  professionalId: string;
}

export const BadgeGrid = ({ professionalId }: BadgeGridProps) => {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [badgesRes, unlockedRes] = await Promise.all([
        supabase.from("badges").select("*").order("created_at"),
        supabase
          .from("professional_badges")
          .select("badge_id")
          .eq("professional_id", professionalId),
      ]);

      if (badgesRes.data) setAllBadges(badgesRes.data as Badge[]);
      if (unlockedRes.data) {
        setUnlockedIds(new Set(unlockedRes.data.map((b) => b.badge_id)));
      }
      setLoading(false);
    };
    load();
  }, [professionalId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="w-12 h-12 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const unlockedCount = allBadges.filter((b) => unlockedIds.has(b.id)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Mis Insignias
        </CardTitle>
        <CardDescription>
          {unlockedCount} de {allBadges.length} desbloqueadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 flex-wrap">
          {allBadges.map((badge) => (
            <BadgeIcon
              key={badge.id}
              icon={badge.icon}
              name={badge.name}
              description={badge.description}
              category={badge.category}
              unlocked={unlockedIds.has(badge.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
