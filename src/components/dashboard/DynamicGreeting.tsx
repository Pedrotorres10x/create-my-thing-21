import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface DynamicGreetingProps {
  userName: string;
  consecutiveDays?: number;
  chapterSize?: number;
  referralsSent?: number;
  meetingsCompleted?: number;
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

const revenueInsights = {
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

    // Pick insight based on activity level
    if (referralsSent > 0 && meetingsCompleted > 0) {
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
  }, [userName, chapterSize, referralsSent, meetingsCompleted]);

  return (
    <Card className="p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-l-primary animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="space-y-1.5">
        <h2 className="text-lg sm:text-2xl font-bold">{greeting}</h2>
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="italic">{insight}</span>
        </p>
      </div>
    </Card>
  );
};
