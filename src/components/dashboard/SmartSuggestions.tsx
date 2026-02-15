import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  referralRole?: string | null;
}

export const SmartSuggestions = ({ goals, referralRole }: SmartSuggestionsProps) => {
  const navigate = useNavigate();

  const calculateSuggestions = (): Suggestion[] => {
    if (!goals) {
      return [{
        id: 'welcome-founder',
        type: 'opportunity',
        priority: 1,
        title: '🚀 Eres pionero: tu Tribu empieza contigo',
        description: 'Sin compañeros no hay negocio. Cada profesional que invites es alguien que puede mandarte clientes de su círculo. Empieza hoy.',
        action: 'Invitar al primero',
        actionRoute: '/referrals',
        icon: UserPlus,
      }];
    }

    const hasCompanions = goals.chapter_member_count > 1;
    const memberCount = goals.chapter_member_count;

    const isRedZone = memberCount < 10;
    const isAmberZone = memberCount >= 10 && memberCount < 20;

    if (!hasCompanions) {
      return [
        {
          id: 'founder-mission',
          type: 'opportunity',
          priority: 1,
          title: '🔴 Sin profesionales no hay negocio',
          description: 'Un grupo vacío = cero clientes referidos. Los primeros que invites serán los que te manden trabajo. No esperes a que otros muevan.',
          action: 'Invitar profesional',
          actionRoute: '/referrals',
          icon: UserPlus,
        },
      ];
    }

    if (isRedZone) {
      const suggestions: Suggestion[] = [];
      const toSafe = 10 - memberCount;

      suggestions.push({
        id: 'red-zone-growth',
        type: 'opportunity',
        priority: 1,
        title: `🔴 Con ${memberCount} miembros, el negocio no arranca`,
        description: `Menos de 10 profesionales = pocas profesiones = pocos clientes cruzados. Necesitas ${toSafe} más para que empiece a fluir el dinero.`,
        action: 'Invitar ahora',
        actionRoute: '/referrals',
        icon: UserPlus,
      });

      if (goals.meetings_this_month === 0) {
        suggestions.push({
          id: 'red-zone-meeting',
          type: 'momentum',
          priority: 2,
          title: 'Conoce a tus compañeros para referir con confianza',
          description: 'Si no conoces bien a alguien, no le vas a mandar clientes. Un café de 30 min = confianza para hacer negocio.',
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
          title: 'Tú primero: refiere un contacto a un compañero',
          description: 'Nadie te va a mandar clientes si tú no das el primer paso. Piensa en UNA persona de tu círculo que necesite lo que ofrece alguien de tu Tribu.',
          action: 'Referir contacto',
          actionRoute: '/referrals',
          icon: Handshake,
        });
      }

      return suggestions.slice(0, 2);
    }

    if (isAmberZone) {
      const suggestions: Suggestion[] = [];
      const toGreen = 20 - memberCount;

      suggestions.push({
        id: 'amber-referral-main',
        type: 'opportunity',
        priority: 1,
        title: `Ya sois ${memberCount}. Ahora toca mover negocio`,
        description: `Tu Tribu ya tiene profesionales suficientes para generar clientes. El que refiere primero, recibe primero. ¿A quién puedes mandar un contacto hoy?`,
        action: 'Referir contacto',
        actionRoute: '/recomendacion',
        icon: Handshake,
      });

      if (goals.meetings_this_month === 0) {
        suggestions.push({
          id: 'amber-meeting',
          type: 'momentum',
          priority: 2,
          title: 'Conoce mejor a tu Tribu para referir con confianza',
          description: 'No puedes mandar clientes a alguien que no conoces bien. Un Cafelito de 30 min = confianza para mover negocio real.',
          action: 'Agendar reunión',
          actionRoute: '/meetings',
          icon: Calendar,
        });
      }

      if (memberCount < 20) {
        suggestions.push({
          id: 'amber-zone-growth',
          type: 'growth',
          priority: 3,
          title: `Faltan ${toGreen} para cubrir más profesiones`,
          description: `Con más variedad de servicios, más clientes puedes derivar y más te derivan a ti. Cada hueco vacío es dinero que se escapa.`,
          action: 'Invitar profesional',
          actionRoute: '/referrals',
          icon: UserPlus,
        });
      }

      if (goals.posts_this_week === 0 && goals.comments_this_week === 0) {
        suggestions.push({
          id: 'amber-visibility',
          type: 'growth',
          priority: 4,
          title: 'Si no saben qué haces, no te refieren',
          description: 'Publica en Somos Únicos qué problemas resuelves. Así tus compañeros sabrán a quién mandar cuando surja la ocasión.',
          action: 'Publicar',
          actionRoute: '/somos-unicos',
          icon: MessageSquare,
        });
      }

      return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 2);
    }

    // === ZONA VERDE: 20+ miembros ===
    const suggestions: Suggestion[] = [];

    if (goals.referrals_this_week === 0) {
      suggestions.push({
        id: 'weekly-referral',
        type: 'opportunity',
        priority: 1,
        title: '¿Quieres recibir clientes? Primero manda tú uno',
        description: `Esta semana no has referido a nadie. Si no das, ¿por qué te van a dar a ti? Quedan ${goals.days_until_week_end} días.`,
        action: 'Referir contacto',
        actionRoute: '/recomendacion',
        icon: Handshake,
      });
    }

    if (goals.meetings_this_month === 0 && goals.days_until_month_end <= 10) {
      suggestions.push({
        id: 'monthly-meeting',
        type: 'momentum',
        priority: 2,
        title: 'Conoce mejor a tus compañeros',
        description: 'No puedes referir clientes a alguien que no conoces bien. Un Cafelito genera la confianza que necesitas para mover negocio.',
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
        title: `🟢 Tribu sana — a por los 50 para maximizar negocio`,
        description: `Con ${memberCount} miembros ya fluye el trabajo. Pero con 50 profesiones distintas, cada contacto de tu agenda tiene un servicio al que derivarlo.`,
        action: 'Ver mi Tribu',
        actionRoute: '/mi-tribu',
        icon: Users,
      });
    }

    if (goals.posts_this_week === 0 && goals.comments_this_week === 0) {
      suggestions.push({
        id: 'visibility',
        type: 'growth',
        priority: 4,
        title: 'Si no saben qué haces, no te pueden referir',
        description: 'Publica en Somos Únicos qué problemas resuelves. Cuando tus compañeros entiendan tu negocio, te mandarán clientes.',
        action: 'Publicar',
        actionRoute: '/somos-unicos',
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
