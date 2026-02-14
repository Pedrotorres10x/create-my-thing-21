import { useEffect, useState } from 'react';
import { TrendingUp, Zap, Crown } from 'lucide-react';

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
    <div className="relative overflow-hidden rounded-2xl gradient-primary p-6 sm:p-8 text-primary-foreground animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Animated background orbs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-float" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5 blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-white/5 blur-2xl animate-float" style={{ animationDelay: '3s' }} />
      
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left: greeting + insight */}
          <div className="flex-1 space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {greeting}
            </h1>
            <p className="text-sm sm:text-base text-primary-foreground/80 flex items-start gap-2 max-w-xl leading-relaxed">
              <Zap className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary-foreground/60" />
              <span className="italic">{insight}</span>
            </p>
          </div>

          {/* Right: ranking badge */}
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <div className="flex items-center gap-2 backdrop-glass rounded-xl px-4 py-2.5">
              <Crown className="h-5 w-5 text-primary-foreground/90" />
              <div className="text-right">
                <p className="text-2xl font-bold leading-none">#{ranking || '—'}</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">La Liga</p>
              </div>
            </div>
            <div className="flex items-center gap-2 backdrop-glass rounded-xl px-4 py-2.5">
              <div 
                className="w-3 h-3 rounded-full ring-2 ring-primary-foreground/30"
                style={{ backgroundColor: levelColor }}
              />
              <div className="text-right">
                <p className="text-sm font-semibold leading-none">{levelName}</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">{totalPoints} pts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
