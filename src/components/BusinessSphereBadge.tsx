import { Badge } from "@/components/ui/badge";
import * as LucideIcons from "lucide-react";

interface BusinessSphereBadgeProps {
  sphereName: string;
  sphereIcon?: string;
  sphereColor?: string;
  className?: string;
}

export const BusinessSphereBadge = ({ 
  sphereName, 
  sphereIcon = "Circle",
  sphereColor = "hsl(var(--primary))",
  className = "" 
}: BusinessSphereBadgeProps) => {
  // Get icon component dynamically
  const IconComponent = (LucideIcons as any)[sphereIcon] || LucideIcons.Circle;
  
  return (
    <Badge 
      variant="secondary" 
      className={`flex items-center gap-1.5 ${className}`}
      style={{ 
        borderColor: sphereColor,
        color: sphereColor
      }}
    >
      <IconComponent className="h-3 w-3" />
      <span>{sphereName}</span>
    </Badge>
  );
};
