import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelBadgeProps {
  level: string;
  color: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export const LevelBadge = ({ level, color, size = "md", showIcon = true }: LevelBadgeProps) => {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1 font-semibold border-2",
        sizeClasses[size]
      )}
      style={{
        backgroundColor: `${color}20`,
        borderColor: color,
        color: color,
      }}
    >
      {showIcon && <Award className={iconSizes[size]} />}
      {level}
    </Badge>
  );
};
