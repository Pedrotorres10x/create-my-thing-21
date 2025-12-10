import { useLovableAlgorithm, EmotionalState } from "@/hooks/useLovableAlgorithm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, 
  Shield, 
  TrendingUp, 
  Gift, 
  Sparkles, 
  X, 
  Eye, 
  Award, 
  Star, 
  Key, 
  Megaphone, 
  Zap, 
  Users,
  HeartHandshake
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  eye: Eye,
  award: Award,
  "heart-handshake": HeartHandshake,
  star: Star,
  key: Key,
  megaphone: Megaphone,
  zap: Zap,
  gift: Gift,
  shield: Shield,
  users: Users,
};

const STATE_ICONS: Record<EmotionalState, React.ComponentType<{ className?: string }>> = {
  active_inspired: Sparkles,
  active_constant: Heart,
  active_at_risk: Shield,
  disconnected_light: TrendingUp,
  disconnected_critical: Shield,
  returning: Gift,
  accelerated_growth: TrendingUp,
  top_performer: Award,
};

export function LovableEngagement() {
  const {
    emotionalState,
    emotionalMetrics,
    activeRewards,
    unreadMessages,
    isLoading,
    markMessageAsRead,
    dismissMessage,
    claimReward,
    getStateLabel,
    getStateColor,
  } = useLovableAlgorithm();

  if (isLoading) {
    return null;
  }

  // No mostrar nada si no hay datos relevantes
  const hasContent = unreadMessages?.length || activeRewards?.length || emotionalMetrics;
  if (!hasContent) {
    return null;
  }

  const StateIcon = emotionalState?.emotional_state 
    ? STATE_ICONS[emotionalState.emotional_state] 
    : Heart;

  return (
    <div className="space-y-4">
      {/* Mensajes personalizados */}
      {unreadMessages && unreadMessages.length > 0 && (
        <div className="space-y-3">
          {unreadMessages.map((message) => (
            <Card 
              key={message.id} 
              className={cn(
                "border-l-4 animate-in slide-in-from-top-2 duration-300",
                message.message_type === "celebration" && "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
                message.message_type === "support" && "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
                message.message_type === "reminder" && "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20",
                message.message_type === "welcome" && "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
                message.message_type === "recognition" && "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
              )}
            >
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium">{message.title}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mt-1 -mr-2"
                    onClick={() => dismissMessage.mutate(message.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground">{message.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => markMessageAsRead.mutate(message.id)}
                  >
                    Marcar como leído
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recompensas activas */}
      {activeRewards && activeRewards.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Tus recompensas activas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeRewards.map((reward) => {
              const IconComponent = reward.reward_type?.icon 
                ? ICON_MAP[reward.reward_type.icon] || Gift
                : Gift;
              
              return (
                <div 
                  key={reward.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-border/50"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {reward.reward_type?.name || "Recompensa"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {reward.reward_type?.description}
                    </p>
                  </div>
                  {reward.expires_at && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Expira {formatDistanceToNow(new Date(reward.expires_at), { locale: es })}
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Métricas emocionales (versión compacta) */}
      {emotionalMetrics && emotionalState && (
        <Card className="border-muted">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <StateIcon className={cn("h-4 w-4", getStateColor(emotionalState.emotional_state))} />
                Tu estado en CONECTOR
              </CardTitle>
              <Badge variant="secondary" className={cn("text-xs", getStateColor(emotionalState.emotional_state))}>
                {getStateLabel(emotionalState.emotional_state)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <MetricItem 
                label="Vínculo" 
                value={emotionalMetrics.emotional_bond_score} 
                icon={Heart}
              />
              <MetricItem 
                label="Confianza" 
                value={emotionalMetrics.trust_index} 
                icon={Shield}
              />
              <MetricItem 
                label="Retención" 
                value={emotionalMetrics.retention_probability} 
                icon={TrendingUp}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MetricItemProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}

function MetricItem({ label, value, icon: Icon }: MetricItemProps) {
  const getColor = (val: number) => {
    if (val >= 70) return "text-green-500";
    if (val >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="text-center space-y-1">
      <div className="flex items-center justify-center gap-1">
        <Icon className={cn("h-3 w-3", getColor(value))} />
        <span className={cn("text-lg font-bold", getColor(value))}>{value}</span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Progress value={value} className="h-1" />
    </div>
  );
}
