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
        id: 'welcome-founder',
        type: 'opportunity',
        priority: 1,
        title: '🚀 Eres pionero: tu Tribu empieza contigo',
        description: 'Los que llegan primero construyen las bases. Invita a un profesional de confianza y empieza a formar tu red de intercambio.',
        action: 'Invitar al primero',
        actionRoute: '/referrals',
        icon: UserPlus,
      }];
    }

    const hasCompanions = goals.chapter_member_count > 1;
    const memberCount = goals.chapter_member_count;

    // Semáforo de salud del grupo:
    // 🔴 <10 = peligro de desaparición
    // 🟡 10-19 = cuidado
    // 🟢 20+ = sano (ideal 50)
    const isRedZone = memberCount < 10;
    const isAmberZone = memberCount >= 10 && memberCount < 20;
    const remaining50 = 50 - memberCount;

    // === SOLO: sin compañeros ===
    if (!hasCompanions) {
      return [
        {
          id: 'founder-mission',
          type: 'opportunity',
          priority: 1,
          title: '🔴 Tu Tribu necesita miembros para sobrevivir',
          description: 'Un grupo con menos de 10 profesionales está en peligro de desaparecer. Eres el fundador: los primeros que invites definirán el futuro de esta red.',
          action: 'Invitar profesional',
          actionRoute: '/referrals',
          icon: UserPlus,
        },
        {
          id: 'founder-visibility',
          type: 'growth',
          priority: 2,
          title: 'Presenta tu negocio en La Calle',
          description: 'Que la comunidad sepa quién eres. Una publicación tuya hoy puede atraer a futuros compañeros.',
          action: 'Publicar',
          actionRoute: '/feed',
          icon: MessageSquare,
        },
      ];
    }

    // === ZONA ROJA: 2-9 miembros — peligro de desaparición ===
    if (isRedZone) {
      const suggestions: Suggestion[] = [];
      const toSafe = 10 - memberCount;

      suggestions.push({
        id: 'red-zone-growth',
        type: 'opportunity',
        priority: 1,
        title: `🔴 Alerta: tu Tribu necesita ${toSafe} miembros más para salir de peligro`,
        description: `Con ${memberCount} miembros, tu grupo puede desaparecer. Los grupos que llegan a 10 sobreviven. Cada invitación cuenta.`,
        action: 'Invitar ahora',
        actionRoute: '/referrals',
        icon: UserPlus,
      });

      if (goals.meetings_this_month === 0) {
        suggestions.push({
          id: 'red-zone-meeting',
          type: 'momentum',
          priority: 2,
          title: 'Fortalece los lazos: agenda un Cara a Cara',
          description: 'En grupos pequeños, cada relación importa el doble. Conoce bien a tus compañeros para referir con confianza.',
          action: 'Agendar reunión',
          actionRoute: '/meetings',
          icon: Calendar,
        });
      }

      if (goals.referrals_this_week === 0 && memberCount >= 3) {
        suggestions.push({
          id: 'red-zone-referral',
          type: 'momentum',
          priority: 3,
          title: '¿Conoces a alguien que necesite un servicio de tu Tribu?',
          description: 'No esperes a ser más. Con que pienses en UNA persona de tu círculo, ya estás activando la red.',
          action: 'Referir contacto',
          actionRoute: '/referrals',
          icon: Handshake,
        });
      }

      return suggestions.slice(0, 2);
    }

    // === ZONA ÁMBAR: 10-19 miembros — cuidado ===
    if (isAmberZone) {
      const suggestions: Suggestion[] = [];
      const toGreen = 20 - memberCount;

      suggestions.push({
        id: 'amber-zone-growth',
        type: 'growth',
        priority: 1,
        title: `🟡 Faltan ${toGreen} miembros para que tu Tribu sea un grupo sano`,
        description: `Con ${memberCount} miembros vais por buen camino, pero un grupo sólido necesita al menos 20. Más profesiones = más intercambio.`,
        action: 'Invitar más',
        actionRoute: '/referrals',
        icon: UserPlus,
      });

      if (goals.referrals_this_week === 0) {
        suggestions.push({
          id: 'amber-referral',
          type: 'opportunity',
          priority: 2,
          title: 'Esta semana aún no has referido a nadie',
          description: `Cada referencia activa la reciprocidad. Quedan ${goals.days_until_week_end} días.`,
          action: 'Referir contacto',
          actionRoute: '/referrals',
          icon: Handshake,
        });
      }

      if (goals.meetings_this_month === 0 && goals.days_until_month_end <= 10) {
        suggestions.push({
          id: 'amber-meeting',
          type: 'momentum',
          priority: 3,
          title: 'Agenda un Cara a Cara este mes',
          description: 'Los miembros que hacen reuniones reciben 3x más referencias.',
          action: 'Agendar reunión',
          actionRoute: '/meetings',
          icon: Calendar,
        });
      }

      if (goals.posts_this_week === 0 && goals.comments_this_week === 0) {
        suggestions.push({
          id: 'amber-visibility',
          type: 'growth',
          priority: 4,
          title: 'Hazte visible en La Calle',
          description: 'Los que publican reciben más referencias.',
          action: 'Publicar',
          actionRoute: '/feed',
          icon: MessageSquare,
        });
      }

      return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 2);
    }

    // === ZONA VERDE: 20+ miembros — grupo sano ===
    const suggestions: Suggestion[] = [];

    if (goals.referrals_this_week === 0) {
      suggestions.push({
        id: 'weekly-referral',
        type: 'opportunity',
        priority: 1,
        title: 'Esta semana aún no has referido a nadie',
        description: `Cada referencia que envías activa la reciprocidad. Quedan ${goals.days_until_week_end} días.`,
        action: 'Referir contacto',
        actionRoute: '/referrals',
        icon: Handshake,
      });
    }

    if (goals.meetings_this_month === 0 && goals.days_until_month_end <= 10) {
      suggestions.push({
        id: 'monthly-meeting',
        type: 'momentum',
        priority: 2,
        title: 'Un 1-a-1 este mes marca la diferencia',
        description: 'Los miembros que hacen reuniones reciben 3x más referencias.',
        action: 'Agendar reunión',
        actionRoute: '/meetings',
        icon: Calendar,
      });
    }

    if (memberCount < 50) {
      suggestions.push({
        id: 'grow-chapter',
        type: 'growth',
        priority: 3,
        title: `🟢 Tribu sana — faltan ${remaining50} para el ideal de 50`,
        description: 'Más profesiones = más clientes que circulan. Sigue invitando para maximizar el intercambio.',
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
        title: 'Hazte visible en La Calle',
        description: 'Los que publican reciben más referencias.',
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
