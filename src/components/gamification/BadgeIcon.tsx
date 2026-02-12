import { 
  Star, Handshake, Network, Lock, Shield, Medal, Crown, Diamond, BookOpen, Coins,
  LucideIcon
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  star: Star,
  handshake: Handshake,
  network: Network,
  lock: Lock,
  shield: Shield,
  medal: Medal,
  crown: Crown,
  diamond: Diamond,
  "book-open": BookOpen,
  coins: Coins,
};

const categoryColors: Record<string, string> = {
  networking: "from-blue-500 to-cyan-400",
  deals: "from-emerald-500 to-green-400",
  engagement: "from-amber-500 to-yellow-400",
  prestige: "from-purple-500 to-pink-400",
};

interface BadgeIconProps {
  icon: string;
  name: string;
  description: string;
  category: string;
  unlocked: boolean;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export const BadgeIcon = ({
  icon,
  name,
  description,
  category,
  unlocked,
  size = "md",
  showTooltip = true,
}: BadgeIconProps) => {
  const Icon = iconMap[icon] || Star;
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const badge = (
    <div
      className={cn(
        "rounded-full flex items-center justify-center transition-all",
        sizeClasses[size],
        unlocked
          ? `bg-gradient-to-br ${categoryColors[category] || categoryColors.engagement} shadow-lg`
          : "bg-muted border-2 border-dashed border-muted-foreground/30"
      )}
    >
      <Icon
        className={cn(
          iconSizes[size],
          unlocked ? "text-white" : "text-muted-foreground/40"
        )}
      />
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {!unlocked && (
            <p className="text-xs text-muted-foreground/60 mt-1 italic">🔒 Bloqueado</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
