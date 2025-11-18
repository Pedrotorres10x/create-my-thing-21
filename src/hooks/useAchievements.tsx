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

export const useAchievements = () => {
  const { user } = useAuth();
  const [achievement, setAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkAchievements = async () => {
      try {
        // Get professional data
        const { data: professional } = await supabase
          .from("professionals")
          .select("id, total_points")
          .eq("user_id", user.id)
          .single();

        if (!professional) return;

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

          // Check for level up
          if (currentState.level !== lastState.level && currentState.points > lastState.points) {
            setAchievement({
              title: "¡Nuevo Nivel Desbloqueado!",
              description: `Has alcanzado el nivel ${currentState.level}`,
              type: "level_up",
              icon: "trophy",
              level: currentState.level,
              points: currentState.points - lastState.points,
            });
          }
          // Check for points milestone
          else if (currentState.points > lastState.points) {
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
          }
          // Check for referral achievement
          else if (currentState.referrals > lastState.referrals) {
            const milestoneMet = 
              (currentState.referrals === 1) ||
              (currentState.referrals === 5) ||
              (currentState.referrals % 10 === 0);
              
            if (milestoneMet) {
              setAchievement({
                title: "¡Maestro de Referidos!",
                description: `Has completado ${currentState.referrals} referidos exitosos`,
                type: "referral",
                icon: "users",
              });
            }
          }
          // Check for meeting achievement
          else if (currentState.meetings > lastState.meetings) {
            const milestoneMet = 
              (currentState.meetings === 1) ||
              (currentState.meetings === 5) ||
              (currentState.meetings === 10) ||
              (currentState.meetings % 20 === 0);
              
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

        // Save current state
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
      } catch (error) {
        console.error("Error checking achievements:", error);
      }
    };

    checkAchievements();

    // Set up real-time subscription for point changes
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
