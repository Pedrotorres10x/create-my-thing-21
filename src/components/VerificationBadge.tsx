import { CheckCircle2, ShieldCheck, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  type: "email" | "nif" | "business";
  className?: string;
  showLabel?: boolean;
}

export function VerificationBadge({ type, className, showLabel = false }: VerificationBadgeProps) {
  const config = {
    email: {
      icon: CheckCircle2,
      label: "Email verificado",
      color: "text-blue-500",
    },
    nif: {
      icon: ShieldCheck,
      label: "Identidad verificada",
      color: "text-green-500",
    },
    business: {
      icon: Building2,
      label: "Empresa verificada",
      color: "text-purple-500",
    },
  };

  const { icon: Icon, label, color } = config[type];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1", className)}>
            <Icon className={cn("h-4 w-4", color)} />
            {showLabel && <span className="text-xs font-medium">{label}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
