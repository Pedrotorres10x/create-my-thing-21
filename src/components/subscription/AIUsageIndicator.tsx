import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export function AIUsageIndicator() {
  const { currentSubscription, getAIMessagesRemaining } = useSubscription();

  if (!currentSubscription) return null;

  const remaining = getAIMessagesRemaining();

  // Unlimited plan or no limit set
  if (remaining === null) {
    return (
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-white/80" />
        <span className="text-xs text-white/90 font-medium">IA sin límites</span>
        <Badge variant="outline" className="bg-white/10 text-white/90 border-white/20 text-[10px] px-1.5 py-0">
          Premium
        </Badge>
      </div>
    );
  }

  const isLow = remaining < 5 && remaining > 0;
  const isExhausted = remaining === 0;

  return (
    <div className="flex items-center gap-1.5">
      <Sparkles className="h-3.5 w-3.5 text-white/80" />
      <span className={`text-xs font-medium ${isExhausted ? 'text-red-200' : isLow ? 'text-yellow-200' : 'text-white/90'}`}>
        {remaining} msg hoy
      </span>
    </div>
  );
}
