import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Achievement } from "@/components/gamification/AchievementModal";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "last_known_state";

interface UserState {
  points: number;
  level: string;
  referrals: number;
  meetings: number;
}

const BADGE_ICON_TO_ACHIEVEMENT: Record<string, Achievement["icon"]> = {
  star: "star",
  handshake: "award",
  network: "users",
  lock: "trophy",
  shield: "award",
  medal: "trophy",
  crown: "trophy",
  diamond: "trophy",
  "book-open": "award",
  coins: "zap",
};

export const useAchievements = () => {
  const { user } = useAuth();
  const [achievement, setAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkAchievements = async () => {
      try {
        const { data: professional } = await supabase
          .from("professionals")
          .select("id, total_points, total_deal_value, deals_completed, created_at")
          .eq("user_id", user.id)
          .single();

        if (!professional) return;

        // Check badge unlocks
        await checkBadgeUnlocks(professional);

        // Get level
        const { data: level } = await supabase
          .from("point_levels")
          .select("name, min_points")
          .lte("min_points", professional.total_points)
          .order("min_points", { ascending: false })
          .limit(1)
          .single();

        // Get referrals count
        const { count: referralsCount } = await supabase
          .from("referrals")
          .select("*", { count: "exact", head: true })
          .eq("referrer_id", professional.id)
          .eq("status", "completed");

        // Get meetings count
        const { count: meetingsCount } = await supabase
          .from("meetings")
          .select("*", { count: "exact", head: true })
          .or(`requester_id.eq.${professional.id},recipient_id.eq.${professional.id}`)
          .eq("status", "completed");

        const currentState: UserState = {
          points: professional.total_points,
          level: level?.name || "Bronce",
          referrals: referralsCount || 0,
          meetings: meetingsCount || 0,
        };

        // Get last known state
        const storedState = localStorage.getItem(STORAGE_KEY);
        if (storedState) {
          const lastState: UserState = JSON.parse(storedState);

          if (currentState.level !== lastState.level && currentState.points > lastState.points) {
            setAchievement({
              title: "¡Nuevo Nivel Desbloqueado!",
              description: `Has alcanzado el nivel ${currentState.level}`,
              type: "level_up",
              icon: "trophy",
              level: currentState.level,
              points: currentState.points - lastState.points,
            });
          } else if (currentState.points > lastState.points) {
            const pointsGained = currentState.points - lastState.points;
            if (pointsGained >= 50) {
              setAchievement({
                title: "¡Excelente Progreso!",
                description: "Sigue acumulando puntos para subir de nivel",
                type: "points",
                icon: "zap",
                points: pointsGained,
              });
            }
          } else if (currentState.referrals > lastState.referrals) {
            const milestoneMet =
              currentState.referrals === 1 ||
              currentState.referrals === 5 ||
              currentState.referrals % 10 === 0;
            if (milestoneMet) {
              setAchievement({
                title: "¡Maestro de Referidos!",
                description: `Has completado ${currentState.referrals} referidos exitosos`,
                type: "referral",
                icon: "users",
              });
            }
          } else if (currentState.meetings > lastState.meetings) {
            const milestoneMet =
              currentState.meetings === 1 ||
              currentState.meetings === 5 ||
              currentState.meetings === 10 ||
              currentState.meetings % 20 === 0;
            if (milestoneMet) {
              setAchievement({
                title: "¡Networker Profesional!",
                description: `Has completado ${currentState.meetings} reuniones exitosas`,
                type: "meeting",
                icon: "award",
              });
            }
          }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
      } catch (error) {
        console.error("Error checking achievements:", error);
      }
    };

    const checkBadgeUnlocks = async (professional: any) => {
      try {
        // Get all badges and already unlocked
        const [badgesRes, unlockedRes] = await Promise.all([
          supabase.from("badges").select("*"),
          supabase
            .from("professional_badges")
            .select("badge_id")
            .eq("professional_id", professional.id),
        ]);

        if (!badgesRes.data) return;
        const unlockedIds = new Set((unlockedRes.data || []).map((b) => b.badge_id));
        const lockedBadges = badgesRes.data.filter((b) => !unlockedIds.has(b.id));
        if (lockedBadges.length === 0) return;

        // Gather stats
        const { count: referrals } = await supabase
          .from("referrals")
          .select("*", { count: "exact", head: true })
          .eq("referrer_id", professional.id)
          .eq("status", "completed");

        const { count: meetings } = await supabase
          .from("meetings")
          .select("*", { count: "exact", head: true })
          .or(`requester_id.eq.${professional.id},recipient_id.eq.${professional.id}`)
          .eq("status", "completed");

        const { data: levelData } = await supabase
          .from("point_levels")
          .select("name")
          .lte("min_points", professional.total_points)
          .order("min_points", { ascending: false })
          .limit(1)
          .single();

        for (const badge of lockedBadges) {
          const condition = badge.unlock_condition as any;
          let shouldUnlock = false;

          switch (condition.type) {
            case "referrals":
              shouldUnlock = (referrals || 0) >= condition.count;
              break;
            case "meetings":
              shouldUnlock = (meetings || 0) >= condition.count;
              break;
            case "deals":
              shouldUnlock = professional.deals_completed >= condition.count;
              break;
            case "deal_value":
              shouldUnlock = professional.total_deal_value >= condition.amount;
              break;
            case "level":
              shouldUnlock = levelData?.name === condition.name;
              break;
            case "active_months": {
              const createdAt = new Date(professional.created_at);
              const monthsActive = Math.floor(
                (Date.now() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
              );
              shouldUnlock = monthsActive >= condition.count;
              break;
            }
          }

          if (shouldUnlock) {
            const { error } = await supabase
              .from("professional_badges")
              .insert({
                professional_id: professional.id,
                badge_id: badge.id,
              });

            if (!error) {
              setAchievement({
                title: `¡Insignia Desbloqueada!`,
                description: `Has conseguido "${badge.name}": ${badge.description}`,
                type: "streak",
                icon: BADGE_ICON_TO_ACHIEVEMENT[badge.icon] || "trophy",
              });
              break; // Show one at a time
            }
          }
        }
      } catch (err) {
        console.error("Error checking badge unlocks:", err);
      }
    };

    checkAchievements();

    const channel = supabase
      .channel("achievement_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "point_transactions",
        },
        () => {
          checkAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearAchievement = () => {
    setAchievement(null);
  };

  return { achievement, clearAchievement };
};
