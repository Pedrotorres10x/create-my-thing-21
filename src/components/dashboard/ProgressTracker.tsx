import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeeklyGoals } from '@/hooks/useWeeklyGoals';

interface ProgressTrackerProps {
  goals: WeeklyGoals | null;
}

export const ProgressTracker = ({ goals }: ProgressTrackerProps) => {
  // Si no hay datos, mostrar objetivos iniciales
  const defaultGoals: WeeklyGoals = {
    referrals_this_week: 0,
    meetings_this_month: 0,
    chapter_member_count: 0,
    days_until_week_end: 7,
    days_until_month_end: 30,
    posts_this_week: 0,
    comments_this_week: 0
  };

  const currentGoals = goals || defaultGoals;
  
  // Detectar usuario nuevo
  const isNewUser = !goals || (
    currentGoals.referrals_this_week === 0 && 
    currentGoals.meetings_this_month === 0 && 
    currentGoals.posts_this_week === 0
  );

  const referralComplete = currentGoals.referrals_this_week >= 1;
  const meetingComplete = currentGoals.meetings_this_month >= 1;
  const chapterComplete = currentGoals.chapter_member_count >= 25;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5" />
          {isNewUser ? 'Tus Primeros Objetivos' : 'Tus Objetivos'}
        </CardTitle>
        {isNewUser && (
          <p className="text-xs text-muted-foreground mt-1">
            Completa estos pasos para empezar a sacar el máximo provecho de CONECTOR
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referido semanal */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              {isNewUser ? '1. Tu primer referido' : 'Referido esta semana'}
            </span>
            <span className={cn(
              "text-sm font-semibold",
              referralComplete ? "text-green-600" : "text-muted-foreground"
            )}>
              {currentGoals.referrals_this_week}/1
            </span>
          </div>
          <Progress 
            value={Math.min(currentGoals.referrals_this_week * 100, 100)} 
            className="h-2"
          />
          {referralComplete && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {isNewUser ? '¡Excelente comienzo!' : '¡Objetivo cumplido!'}
            </p>
          )}
          {!referralComplete && !isNewUser && currentGoals.days_until_week_end <= 2 && (
            <p className="text-xs text-orange-600 mt-1">
              Quedan {currentGoals.days_until_week_end} {currentGoals.days_until_week_end === 1 ? 'día' : 'días'}
            </p>
          )}
        </div>

        {/* Reunión mensual - Solo mostrar si no es usuario nuevo o si ya completó referido */}
        {(!isNewUser || referralComplete) && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">
                {isNewUser ? '2. Tu primera reunión' : 'Reunión este mes'}
              </span>
              <span className={cn(
                "text-sm font-semibold",
                meetingComplete ? "text-green-600" : "text-muted-foreground"
              )}>
                {currentGoals.meetings_this_month}/1
              </span>
            </div>
            <Progress 
              value={Math.min(currentGoals.meetings_this_month * 100, 100)} 
              className="h-2"
            />
            {meetingComplete && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {isNewUser ? '¡Vas por buen camino!' : '¡Objetivo cumplido!'}
              </p>
            )}
            {!meetingComplete && !isNewUser && currentGoals.days_until_month_end <= 7 && (
              <p className="text-xs text-orange-600 mt-1">
                Quedan {currentGoals.days_until_month_end} días
              </p>
            )}
          </div>
        )}

        {/* Capítulo - Solo mostrar si no es usuario nuevo o si ya tiene actividad */}
        {(!isNewUser || (referralComplete && meetingComplete)) && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">
                {isNewUser ? '3. Únete a un capítulo' : 'Miembros en capítulo'}
              </span>
              <span className={cn(
                "text-sm font-semibold",
                chapterComplete ? "text-green-600" : "text-muted-foreground"
              )}>
                {currentGoals.chapter_member_count}/25
              </span>
            </div>
            <Progress 
              value={(currentGoals.chapter_member_count / 25) * 100} 
              className="h-2"
            />
            {chapterComplete && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                ¡Capítulo completo!
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
