import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Calendar, 
  Users, 
  MessageSquare, 
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Info
} from 'lucide-react';
import { WeeklyGoals } from '@/hooks/useWeeklyGoals';
import { cn } from '@/lib/utils';

interface Suggestion {
  id: string;
  type: 'urgent' | 'important' | 'recommended';
  title: string;
  description: string;
  action: string;
  actionRoute: string;
  icon: React.ElementType;
  priority: number;
  deadline?: string;
}

interface SmartSuggestionsProps {
  goals: WeeklyGoals | null;
}

export const SmartSuggestions = ({ goals }: SmartSuggestionsProps) => {
  const navigate = useNavigate();

  const calculateSuggestions = (): Suggestion[] => {
    // Si no hay datos de goals, usuario nuevo - mostrar SOLO primera acción
    if (!goals) {
      return [
        {
          id: 'welcome-referral',
          type: 'important',
          priority: 1,
          title: '👋 ¡Bienvenido! Empieza invitando a alguien',
          description: 'El primer paso es invitar a un profesional que conozcas. Es rápido y sencillo.',
          action: 'Invitar ahora',
          actionRoute: '/referrals',
          icon: UserPlus
        }
      ];
    }

    // Detectar si es usuario nuevo (sin actividad significativa)
    const isNewUser = goals.referrals_this_week === 0 && 
                      goals.meetings_this_month === 0 && 
                      goals.posts_this_week === 0 && 
                      goals.comments_this_week === 0;

    // Para usuarios nuevos: onboarding paso a paso
    if (isNewUser) {
      const onboardingSuggestions: Suggestion[] = [];
      
      // Paso 1: Si no ha invitado a nadie, solo mostrar eso
      if (goals.referrals_this_week === 0) {
        onboardingSuggestions.push({
          id: 'onboarding-referral',
          type: 'important',
          priority: 1,
          title: '🎯 Tu primera misión: Invita a 1 persona',
          description: '¿Conoces a algún profesional que debería estar aquí? Invítalo y empieza a construir tu red.',
          action: 'Invitar ahora',
          actionRoute: '/referrals',
          icon: UserPlus
        });
        return onboardingSuggestions.slice(0, 1); // Solo 1 sugerencia
      }

      // Paso 2: Ya tiene 1+ referido, ahora sugerir capítulo
      if (goals.chapter_member_count === 0) {
        onboardingSuggestions.push({
          id: 'onboarding-chapter',
          type: 'important',
          priority: 1,
          title: '👥 Siguiente paso: Únete a un capítulo',
          description: 'Encuentra profesionales de tu zona y empieza a generar oportunidades locales.',
          action: 'Buscar capítulo',
          actionRoute: '/chapter',
          icon: Users
        });
        return onboardingSuggestions.slice(0, 1); // Solo 1 sugerencia
      }

      // Paso 3: Ya tiene capítulo, sugerir reunión
      if (goals.meetings_this_month === 0) {
        onboardingSuggestions.push({
          id: 'onboarding-meeting',
          type: 'important',
          priority: 1,
          title: '📅 Último paso: Agenda tu primera reunión',
          description: 'Las reuniones uno a uno son donde ocurre la magia. Agenda una esta semana.',
          action: 'Ver profesionales',
          actionRoute: '/meetings',
          icon: Calendar
        });
        return onboardingSuggestions.slice(0, 1); // Solo 1 sugerencia
      }

      // Si ya completó el onboarding básico, pasar a sugerencias normales
    }

    // SUGERENCIAS PARA USUARIOS ACTIVOS
    const suggestions: Suggestion[] = [];

    // 1. REFERIDO ESTA SEMANA (KPI crítico)
    if (goals.referrals_this_week === 0 && goals.days_until_week_end <= 3) {
      const urgency = goals.days_until_week_end <= 1 ? 'urgent' : 'important';
      suggestions.push({
        id: 'referral-weekly',
        type: urgency as 'urgent' | 'important',
        priority: 1,
        title: goals.days_until_week_end <= 1 ? '⏰ ¡Solo quedan horas!' : '🟠 Invita a tu referido semanal',
        description: `Quedan ${goals.days_until_week_end} ${goals.days_until_week_end === 1 ? 'día' : 'días'} para cumplir tu objetivo semanal.`,
        action: 'Invitar ahora',
        actionRoute: '/referrals',
        icon: UserPlus,
        deadline: `Quedan ${goals.days_until_week_end} ${goals.days_until_week_end === 1 ? 'día' : 'días'}`
      });
    }

    // 2. REUNIÓN ESTE MES (KPI crítico)
    if (goals.meetings_this_month === 0 && goals.days_until_month_end <= 7) {
      suggestions.push({
        id: 'meeting-monthly',
        type: 'urgent',
        priority: 2,
        title: '🟠 Solicita tu reunión mensual',
        description: `Ya estamos a fin de mes, quedan ${goals.days_until_month_end} días. Agenda tu reunión para cumplir el objetivo.`,
        action: 'Buscar profesionales',
        actionRoute: '/meetings',
        icon: Calendar,
        deadline: `Quedan ${goals.days_until_month_end} días`
      });
    }

    // 3. CAPÍTULO PEQUEÑO (KPI crítico)
    if (goals.chapter_member_count < 25 && goals.chapter_member_count > 0) {
      suggestions.push({
        id: 'chapter-growth',
        type: 'important',
        priority: 3,
        title: '🟡 Ayuda a crecer tu capítulo',
        description: `Tu capítulo tiene ${goals.chapter_member_count}/25 miembros. ¡Cada nuevo miembro multiplica las oportunidades!`,
        action: 'Ver capítulo',
        actionRoute: '/chapter',
        icon: Users
      });
    }

    // 4. ENGAGEMENT EN FEED
    if (goals.posts_this_week === 0 && goals.comments_this_week === 0) {
      suggestions.push({
        id: 'feed-engagement',
        type: 'recommended',
        priority: 4,
        title: '💬 Participa en la comunidad',
        description: 'Comparte o comenta para aumentar tu visibilidad y conectar con más profesionales.',
        action: 'Ir al Feed',
        actionRoute: '/feed',
        icon: MessageSquare
      });
    }

    // 5. EXPLORAR MARKETPLACE
    suggestions.push({
      id: 'marketplace-explore',
      type: 'recommended',
      priority: 5,
      title: '🎯 Descubre oportunidades',
      description: 'Explora el marketplace premium y encuentra servicios que pueden impulsar tu negocio.',
      action: 'Ver marketplace',
      actionRoute: '/premium-marketplace',
      icon: TrendingUp
    });

    // Limitar sugerencias según urgencia
    const urgentCount = suggestions.filter(s => s.type === 'urgent').length;
    const maxSuggestions = urgentCount > 0 ? 2 : 3;
    
    return suggestions.sort((a, b) => a.priority - b.priority).slice(0, maxSuggestions);
  };

  const suggestions = calculateSuggestions();

  const getTypeStyles = (type: Suggestion['type']) => {
    switch (type) {
      case 'urgent':
        return {
          border: 'border-l-red-500',
          badge: 'bg-red-500',
          icon: AlertCircle
        };
      case 'important':
        return {
          border: 'border-l-orange-500',
          badge: 'bg-orange-500',
          icon: Info
        };
      default:
        return {
          border: 'border-l-blue-500',
          badge: 'bg-blue-500',
          icon: Info
        };
    }
  };

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => {
        const styles = getTypeStyles(suggestion.type);
        const Icon = suggestion.icon;

        return (
          <Card 
            key={suggestion.id}
            className={cn(
              "border-l-4 transition-all hover:shadow-md",
              styles.border
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  suggestion.type === 'urgent' && "bg-red-500/10",
                  suggestion.type === 'important' && "bg-orange-500/10",
                  suggestion.type === 'recommended' && "bg-blue-500/10"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    suggestion.type === 'urgent' && "text-red-500",
                    suggestion.type === 'important' && "text-orange-500",
                    suggestion.type === 'recommended' && "text-blue-500"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{suggestion.title}</h3>
                    {suggestion.deadline && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {suggestion.deadline}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {suggestion.description}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate(suggestion.actionRoute)}
                    className="w-full sm:w-auto"
                  >
                    {suggestion.action}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
