import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export function AIUsageIndicator() {
  const { currentSubscription, getAIMessagesRemaining } = useSubscription();

  if (!currentSubscription) return null;

  const remaining = getAIMessagesRemaining();
  const limit = currentSubscription.plan.ai_messages_limit;

  // Unlimited plan
  if (remaining === null) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">IA sin límites</span>
        <Badge variant="outline" className="ml-auto">
          {currentSubscription.plan.name}
        </Badge>
      </div>
    );
  }

  const used = currentSubscription.ai_messages_count;
  const percentage = limit ? (used / limit) * 100 : 0;
  const isLow = remaining < 10 && remaining > 0;
  const isExhausted = remaining === 0;

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">Mensajes de IA</span>
        </div>
        <span className={`text-sm font-medium ${isExhausted ? 'text-destructive' : isLow ? 'text-orange-500' : ''}`}>
          {remaining} / {limit}
        </span>
      </div>
      
      <Progress 
        value={percentage} 
        className={`h-2 ${isExhausted ? '[&>div]:bg-destructive' : isLow ? '[&>div]:bg-orange-500' : ''}`}
      />
      
      {isExhausted && (
        <p className="text-xs text-destructive">
          Has alcanzado el límite mensual. Actualiza tu plan para continuar.
        </p>
      )}
      
      {isLow && !isExhausted && (
        <p className="text-xs text-orange-500">
          Te quedan pocos mensajes este mes.
        </p>
      )}
      
      <p className="text-xs text-muted-foreground">
        Se reinicia el {new Date(currentSubscription.ai_messages_reset_at).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long'
        })}
      </p>
    </div>
  );
}
