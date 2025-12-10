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
  HeartHandshake,
  Sun,
  Flame,
  ArrowUpRight
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

// Iconos más emocionales y positivos para cada estado
const STATE_ICONS: Record<EmotionalState, React.ComponentType<{ className?: string }>> = {
  active_inspired: Sparkles,
  active_constant: Heart,
  active_at_risk: Sun,
  disconnected_light: Heart,
  disconnected_critical: HeartHandshake,
  returning: Gift,
  accelerated_growth: Flame,
  top_performer: Award,
};

// Mensajes de estado más cálidos y humanos
const STATE_MESSAGES: Record<EmotionalState, string> = {
  active_inspired: "Tu energía inspira a toda la comunidad",
  active_constant: "Tu constancia es tu mayor fortaleza",
  active_at_risk: "Estamos aquí cuando lo necesites",
  disconnected_light: "Tu capítulo te echa de menos",
  disconnected_critical: "Siempre habrá un lugar para ti aquí",
  returning: "¡Qué alegría verte de vuelta!",
  accelerated_growth: "Tu crecimiento es impresionante",
  top_performer: "Eres un referente para tu comunidad",
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

  const stateMessage = emotionalState?.emotional_state 
    ? STATE_MESSAGES[emotionalState.emotional_state]
    : null;

  return (
    <div className="space-y-4">
      {/* Mensajes personalizados LOVABLE */}
      {unreadMessages && unreadMessages.length > 0 && (
        <div className="space-y-3">
          {unreadMessages.map((message) => (
            <Card 
              key={message.id} 
              className={cn(
                "border-l-4 animate-in slide-in-from-top-2 duration-300 shadow-sm",
                message.message_type === "celebration" && "border-l-amber-400 bg-gradient-to-r from-amber-50/80 to-background dark:from-amber-950/30",
                message.message_type === "support" && "border-l-sky-400 bg-gradient-to-r from-sky-50/80 to-background dark:from-sky-950/30",
                message.message_type === "reminder" && "border-l-violet-400 bg-gradient-to-r from-violet-50/80 to-background dark:from-violet-950/30",
                message.message_type === "welcome" && "border-l-emerald-400 bg-gradient-to-r from-emerald-50/80 to-background dark:from-emerald-950/30",
                message.message_type === "recognition" && "border-l-rose-400 bg-gradient-to-r from-rose-50/80 to-background dark:from-rose-950/30"
              )}
            >
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1.5 rounded-full",
                      message.message_type === "celebration" && "bg-amber-100 dark:bg-amber-900/50",
                      message.message_type === "support" && "bg-sky-100 dark:bg-sky-900/50",
                      message.message_type === "reminder" && "bg-violet-100 dark:bg-violet-900/50",
                      message.message_type === "welcome" && "bg-emerald-100 dark:bg-emerald-900/50",
                      message.message_type === "recognition" && "bg-rose-100 dark:bg-rose-900/50"
                    )}>
                      <Heart className={cn(
                        "h-3.5 w-3.5",
                        message.message_type === "celebration" && "text-amber-600",
                        message.message_type === "support" && "text-sky-600",
                        message.message_type === "reminder" && "text-violet-600",
                        message.message_type === "welcome" && "text-emerald-600",
                        message.message_type === "recognition" && "text-rose-600"
                      )} />
                    </div>
                    <CardTitle className="text-sm font-medium">{message.title}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mt-1 -mr-2 opacity-60 hover:opacity-100"
                    onClick={() => dismissMessage.mutate(message.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-foreground/80 leading-relaxed">{message.content}</p>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: es })}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => markMessageAsRead.mutate(message.id)}
                  >
                    Entendido
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recompensas activas - micro-recompensas emocionales */}
      {activeRewards && activeRewards.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-primary/10">
                <Gift className="h-3.5 w-3.5 text-primary" />
              </div>
              Tus reconocimientos activos
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
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {reward.reward_type?.name || "Reconocimiento"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {reward.reward_type?.description}
                    </p>
                  </div>
                  {reward.expires_at && (
                    <Badge variant="secondary" className="text-xs shrink-0 bg-muted/50">
                      {formatDistanceToNow(new Date(reward.expires_at), { locale: es })}
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tu vínculo con CONECTOR - métricas emocionales */}
      {emotionalMetrics && emotionalState && (
        <Card className="border-muted overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-full",
                  emotionalState.emotional_state === "active_inspired" && "bg-amber-100 dark:bg-amber-900/50",
                  emotionalState.emotional_state === "active_constant" && "bg-emerald-100 dark:bg-emerald-900/50",
                  emotionalState.emotional_state === "top_performer" && "bg-amber-100 dark:bg-amber-900/50",
                  emotionalState.emotional_state === "accelerated_growth" && "bg-orange-100 dark:bg-orange-900/50",
                  emotionalState.emotional_state === "returning" && "bg-sky-100 dark:bg-sky-900/50",
                  ["active_at_risk", "disconnected_light", "disconnected_critical"].includes(emotionalState.emotional_state) && "bg-muted"
                )}>
                  <StateIcon className={cn("h-3.5 w-3.5", getStateColor(emotionalState.emotional_state))} />
                </div>
                Tu vínculo con CONECTOR
              </CardTitle>
              <Badge variant="secondary" className={cn("text-xs", getStateColor(emotionalState.emotional_state))}>
                {getStateLabel(emotionalState.emotional_state)}
              </Badge>
            </div>
            {stateMessage && (
              <p className="text-xs text-muted-foreground mt-1 ml-8">{stateMessage}</p>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <MetricItem 
                label="Vínculo" 
                value={emotionalMetrics.emotional_bond_score} 
                icon={Heart}
                description="Conexión emocional"
              />
              <MetricItem 
                label="Confianza" 
                value={emotionalMetrics.trust_index} 
                icon={Shield}
                description="Credibilidad"
              />
              <MetricItem 
                label="Engagement" 
                value={emotionalMetrics.retention_probability} 
                icon={ArrowUpRight}
                description="Compromiso"
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
  description?: string;
}

function MetricItem({ label, value, icon: Icon, description }: MetricItemProps) {
  const getColor = (val: number) => {
    if (val >= 70) return "text-emerald-500";
    if (val >= 40) return "text-amber-500";
    return "text-rose-500";
  };

  const getProgressColor = (val: number) => {
    if (val >= 70) return "bg-emerald-500";
    if (val >= 40) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="text-center space-y-1.5 p-2 rounded-lg bg-muted/30">
      <div className="flex items-center justify-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", getColor(value))} />
        <span className={cn("text-lg font-bold tabular-nums", getColor(value))}>{value}</span>
      </div>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", getProgressColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
