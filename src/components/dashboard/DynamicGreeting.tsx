import { useEffect, useState } from 'react';
import { Crown, Zap } from 'lucide-react';

interface DynamicGreetingProps {
  userName: string;
  consecutiveDays?: number;
  chapterSize?: number;
  referralsSent?: number;
  meetingsCompleted?: number;
  ranking?: number;
  totalPoints?: number;
  levelName?: string;
  levelColor?: string;
  isProfileIncomplete?: boolean;
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

const revenueInsights = {
  profileIncomplete: [
    "Tu perfil está a medias. Complétalo para que tu Tribu sepa a quién referir clientes.",
    "Sin un perfil completo, nadie sabe qué haces. Termínalo y empieza a recibir referencias.",
    "Primer paso: que te conozcan. Completa tu perfil y abre la puerta a nuevos clientes.",
  ],
  noActivity: [
    "Cada profesional de tu Tribu puede ser un comercial que trabaja para ti. Gratis.",
    "Tu red ya está generando dinero para otros. La pregunta es si tú estás dentro.",
    "Un grupo de 20 profesionales = 20 comerciales buscándote clientes. Sin comisiones.",
  ],
  smallGroup: (size: number) => [
    `Tu Tribu tiene ${size} miembros. Cada hueco vacío es un cliente que no te llega.`,
    `${size} profesionales ya pueden referirte clientes. Imagina con 25.`,
    `Con ${size} miembros activos, cada 1-a-1 es una puerta a nuevos clientes.`,
  ],
  hasReferrals: (count: number) => [
    `Ya has movido ${count} contacto${count > 1 ? 's' : ''}. Cada uno puede convertirse en factura.`,
    `${count} referencia${count > 1 ? 's' : ''} enviada${count > 1 ? 's' : ''}. Así se construye un flujo de clientes constante.`,
    `Llevas ${count} conexión${count > 1 ? 'es' : ''} activa${count > 1 ? 's' : ''}. La máquina está en marcha.`,
  ],
  hasMeetings: (count: number) => [
    `${count} reunión${count > 1 ? 'es' : ''} cara a cara. Cada una es confianza = más referencias.`,
    `Ya conoces el negocio de ${count} profesional${count > 1 ? 'es' : ''}. Ellos conocen el tuyo. Eso mueve dinero.`,
  ],
  active: [
    "Tu red está trabajando mientras tú haces lo tuyo. Eso es el juego.",
    "Cada semana que pasas activo, tu flujo de clientes se multiplica.",
    "Los que se mueven primero son los que más reciben. Tú ya estás aquí.",
  ],
};

const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const DynamicGreeting = ({ 
  userName, 
  consecutiveDays = 0,
  chapterSize = 0,
  referralsSent = 0,
  meetingsCompleted = 0,
  ranking = 0,
  totalPoints = 0,
  levelName = 'Bronce',
  levelColor = '#CD7F32',
  isProfileIncomplete = false,
}: DynamicGreetingProps) => {
  const [greeting, setGreeting] = useState('');
  const [insight, setInsight] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    let timeOfDay: TimeOfDay;

    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const greetings: Record<TimeOfDay, string[]> = {
      morning: [`Buenos días, ${userName}`],
      afternoon: [`Buenas tardes, ${userName}`],
      evening: [`Buenas noches, ${userName}`],
      night: [`Buenas noches, ${userName}`],
    };

    setGreeting(pickRandom(greetings[timeOfDay]));

    if (isProfileIncomplete) {
      setInsight(pickRandom(revenueInsights.profileIncomplete));
    } else if (referralsSent > 0 && meetingsCompleted > 0) {
      setInsight(pickRandom(revenueInsights.active));
    } else if (meetingsCompleted > 0) {
      setInsight(pickRandom(revenueInsights.hasMeetings(meetingsCompleted)));
    } else if (referralsSent > 0) {
      setInsight(pickRandom(revenueInsights.hasReferrals(referralsSent)));
    } else if (chapterSize > 0) {
      setInsight(pickRandom(revenueInsights.smallGroup(chapterSize)));
    } else {
      setInsight(pickRandom(revenueInsights.noActivity));
    }
  }, [userName, chapterSize, referralsSent, meetingsCompleted, isProfileIncomplete]);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">
          {greeting}
        </h1>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 max-w-xl">
          <Zap className="h-3 w-3 flex-shrink-0 text-primary" />
          <span>{insight}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 bg-card">
          <Crown className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-bold text-foreground">#{ranking || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 bg-card">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: levelColor }}
          />
          <span className="text-xs font-medium text-muted-foreground">{levelName}</span>
          <span className="text-xs font-bold text-foreground">{totalPoints}</span>
        </div>
      </div>
    </div>
  );
};
