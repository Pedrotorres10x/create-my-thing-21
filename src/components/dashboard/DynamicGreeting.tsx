import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Flame } from 'lucide-react';

interface DynamicGreetingProps {
  userName: string;
  consecutiveDays?: number;
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export const DynamicGreeting = ({ userName, consecutiveDays = 0 }: DynamicGreetingProps) => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    let timeOfDay: TimeOfDay;

    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const greetings: Record<TimeOfDay, string[]> = {
      morning: [
        `¡Buenos días, ${userName}! ☀️`,
        `Buenos días ${userName}, listo para conectar 🚀`,
        `¡Hola ${userName}! Un nuevo día para crecer 🌱`,
      ],
      afternoon: [
        `¡Buenas tardes, ${userName}! 👋`,
        `Hola ${userName}, ¿cómo va tu día? 💼`,
        `Buenas tardes ${userName}, sigamos conectando 🤝`,
      ],
      evening: [
        `¡Buenas noches, ${userName}! 🌙`,
        `Hola ${userName}, perfecto momento para revisar tu red 🌐`,
      ],
      night: [
        `Hola ${userName}, ¿trabajando hasta tarde? 💪`,
        `Buenas noches ${userName} 🌃`,
      ]
    };

    const options = greetings[timeOfDay];
    const randomGreeting = options[Math.floor(Math.random() * options.length)];
    setGreeting(randomGreeting);
  }, [userName]);

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-l-4 border-l-primary animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{greeting}</h2>
          {consecutiveDays > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Llevas {consecutiveDays} {consecutiveDays === 1 ? 'día' : 'días'} consecutivos activo
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
