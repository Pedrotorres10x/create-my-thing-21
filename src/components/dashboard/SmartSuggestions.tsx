import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Calendar, 
  Users, 
  MessageSquare, 
  ArrowRight,
  Handshake,
} from 'lucide-react';
import { WeeklyGoals } from '@/hooks/useWeeklyGoals';
import { cn } from '@/lib/utils';

interface Suggestion {
  id: string;
  type: 'opportunity' | 'momentum' | 'growth';
  title: string;
  description: string;
  action: string;
  actionRoute: string;
  icon: React.ElementType;
  priority: number;
}

interface SmartSuggestionsProps {
  goals: WeeklyGoals | null;
}

export const SmartSuggestions = ({ goals }: SmartSuggestionsProps) => {
  const navigate = useNavigate();

  const calculateSuggestions = (): Suggestion[] => {
    if (!goals) {
      return [{
        id: 'welcome',
        type: 'opportunity',
        priority: 1,
        title: 'Tu primer paso: invita a un profesional',
        description: 'Cada persona que invitas es alguien que puede referirte clientes de su círculo. Empieza con uno.',
        action: 'Invitar',
        actionRoute: '/referrals',
        icon: UserPlus,
      }];
    }

    // A user alone (0 or 1 members = just themselves) can't send referrals
    const hasCompanions = goals.chapter_member_count > 1;

    const isNewUser = goals.referrals_this_week === 0 && 
                      goals.meetings_this_month === 0 && 
                      goals.posts_this_week === 0;

    if (isNewUser) {
      if (!hasCompanions) {
        // No companions → priority is to invite, not refer
        return [{
          id: 'first-invite',
          type: 'opportunity',
          priority: 1,
          title: 'Invita a tu primer compañero',
          description: 'Todavía no tienes compañeros en tu Tribu. Para poder intercambiar referencias, primero necesitas profesionales a quienes referir clientes.',
          action: 'Invitar profesional',
          actionRoute: '/referrals',
          icon: UserPlus,
        }];
      }

      if (goals.referrals_this_week === 0) {
        return [{
          id: 'first-referral',
          type: 'opportunity',
          priority: 1,
          title: '¿A quién de tus contactos le vendría bien un compañero tuyo?',
          description: 'Piensa en tu círculo: amigos, clientes, conocidos. ¿Alguno necesita un servicio que ofrece alguien de tu Tribu?',
          action: 'Referir contacto',
          actionRoute: '/referrals',
          icon: Handshake,
        }];
      }

      if (goals.meetings_this_month === 0) {
        return [{
          id: 'first-meeting',
          type: 'momentum',
          priority: 1,
          title: 'Agenda tu primer Cara a Cara',
          description: 'La confianza se construye en persona. Un café de 30 minutos hoy puede ser tu próximo cliente mañana.',
          action: 'Agendar reunión',
          actionRoute: '/meetings',
          icon: Calendar,
        }];
      }
    }

    const suggestions: Suggestion[] = [];

    // Only suggest referrals if the user has companions to refer TO
    if (goals.referrals_this_week === 0 && hasCompanions) {
      suggestions.push({
        id: 'weekly-referral',
        type: 'opportunity',
        priority: 1,
        title: 'Esta semana aún no has referido a nadie',
        description: `Cada referencia que envías activa la reciprocidad. Si tú mueves, ellos mueven. Quedan ${goals.days_until_week_end} días.`,
        action: 'Referir contacto',
        actionRoute: '/referrals',
        icon: Handshake,
      });
    }

    // No companions → always push invite as top suggestion
    if (!hasCompanions) {
      suggestions.push({
        id: 'grow-invite',
        type: 'opportunity',
        priority: 1,
        title: 'Tu Tribu te necesita: invita profesionales',
        description: 'Sin compañeros no hay intercambio de referencias. Cada profesional que invites amplía la red para todos.',
        action: 'Invitar',
        actionRoute: '/referrals',
        icon: UserPlus,
      });
    }

    if (goals.meetings_this_month === 0 && goals.days_until_month_end <= 10 && hasCompanions) {
      suggestions.push({
        id: 'monthly-meeting',
        type: 'momentum',
        priority: 2,
        title: 'Un 1-a-1 este mes marca la diferencia',
        description: 'Los miembros que hacen reuniones reciben 3x más referencias. Quedan pocos días.',
        action: 'Agendar reunión',
        actionRoute: '/meetings',
        icon: Calendar,
      });
    }

    if (hasCompanions && goals.chapter_member_count < 25) {
      const remaining = 25 - goals.chapter_member_count;
      suggestions.push({
        id: 'grow-chapter',
        type: 'growth',
        priority: 3,
        title: `Faltan ${remaining} profesiones por cubrir en tu Tribu`,
        description: 'Cada profesión nueva es un servicio más que tu red puede ofrecer. Más servicios = más clientes que circulan.',
        action: 'Ver mi Tribu',
        actionRoute: '/chapter',
        icon: Users,
      });
    }

    if (goals.posts_this_week === 0 && goals.comments_this_week === 0) {
      suggestions.push({
        id: 'visibility',
        type: 'growth',
        priority: 4,
        title: 'Hazte visible en La Fogata',
        description: 'Los que publican reciben más referencias. No hace falta escribir un libro: una frase sobre tu trabajo basta.',
        action: 'Publicar',
        actionRoute: '/feed',
        icon: MessageSquare,
      });
    }

    return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 2);
  };

  const suggestions = calculateSuggestions();

  const getTypeStyles = (type: Suggestion['type']) => {
    switch (type) {
      case 'opportunity':
        return 'border-l-primary bg-primary/5';
      case 'momentum':
        return 'border-l-amber-500 bg-amber-500/5';
      case 'growth':
        return 'border-l-emerald-500 bg-emerald-500/5';
    }
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {suggestions.map((suggestion) => {
        const Icon = suggestion.icon;

        return (
          <Card 
            key={suggestion.id}
            className={cn("border-l-4 transition-all hover:shadow-md", getTypeStyles(suggestion.type))}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-background/80 flex-shrink-0">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs sm:text-sm mb-0.5">{suggestion.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    {suggestion.description}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(suggestion.actionRoute)}
                    className="text-xs sm:text-sm h-8"
                  >
                    {suggestion.action}
                    <ArrowRight className="ml-1.5 h-3 w-3" />
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
