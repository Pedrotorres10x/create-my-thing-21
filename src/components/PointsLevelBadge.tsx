import { LevelBadge } from "./LevelBadge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PointLevel {
  level_number: number;
  name: string;
  badge_color: string;
  min_points: number;
  max_points: number | null;
}

interface PointsLevelBadgeProps {
  points: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export const PointsLevelBadge = ({ points, size = "sm", showIcon = true }: PointsLevelBadgeProps) => {
  const [currentLevel, setCurrentLevel] = useState<PointLevel | null>(null);

  useEffect(() => {
    const fetchLevel = async () => {
      const { data: levels } = await supabase
        .from('point_levels')
        .select('*')
        .order('min_points', { ascending: false });

      if (levels) {
        const level = levels.find(l => 
          points >= l.min_points && (l.max_points === null || points <= l.max_points)
        );
        if (level) {
          setCurrentLevel(level);
        }
      }
    };

    fetchLevel();
  }, [points]);

  if (!currentLevel) {
    return null;
  }

  return (
    <LevelBadge
      level={currentLevel.name}
      color={currentLevel.badge_color}
      size={size}
      showIcon={showIcon}
    />
  );
};
