import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, Target } from 'lucide-react';

interface RoleNeed {
  role: string;
  label: string;
  emoji: string;
  count: number;
  examples: string;
}

interface TribeRoleNeedsProps {
  chapterId: string | null;
}

export function TribeRoleNeeds({ chapterId }: TribeRoleNeedsProps) {
  const [needs, setNeeds] = useState<RoleNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!chapterId) {
      setLoading(false);
      return;
    }
    loadBalance();
  }, [chapterId]);

  const loadBalance = async () => {
    try {
      // @ts-ignore
      const { data } = await supabase
        .from('professionals')
        .select('specializations (referral_role)')
        .eq('chapter_id', chapterId)
        .eq('status', 'approved');

      if (!data) return;

      const roles = (data as any[]).map(m => m.specializations?.referral_role || 'unknown');
      const referrers = roles.filter(r => r === 'referrer').length;
      const receivers = roles.filter(r => r === 'receiver').length;
      const hybrids = roles.filter(r => r === 'hybrid').length;
      const t = roles.length;
      setTotal(t);

      const roleNeeds: RoleNeed[] = [];

      if (referrers === 0) {
        roleNeeds.push({
          role: 'referrer',
          label: 'Referidores',
          emoji: '📡',
          count: 0,
          examples: 'Bares, restaurantes, gimnasios, tiendas, nutricionistas…',
        });
      } else if (referrers < 3 && t >= 5) {
        roleNeeds.push({
          role: 'referrer',
          label: 'Más referidores',
          emoji: '📡',
          count: referrers,
          examples: 'Negocios de proximidad que generen leads para el grupo.',
        });
      }

      if (receivers === 0) {
        roleNeeds.push({
          role: 'receiver',
          label: 'Receptores',
          emoji: '🎯',
          count: 0,
          examples: 'Abogados, arquitectos, asesores financieros, inmobiliarias…',
        });
      } else if (receivers < 3 && t >= 5) {
        roleNeeds.push({
          role: 'receiver',
          label: 'Más receptores',
          emoji: '🎯',
          count: receivers,
          examples: 'Profesionales de servicios que conviertan leads en negocio.',
        });
      }

      if (hybrids === 0 && t >= 10) {
        roleNeeds.push({
          role: 'hybrid',
          label: 'Híbridos',
          emoji: '🔄',
          count: 0,
          examples: 'Marketing, diseño, coaching, contabilidad…',
        });
      }

      setNeeds(roleNeeds);
    } catch (e) {
      console.error('Error loading tribe role needs:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !chapterId || total === 0) return null;

  if (needs.length === 0) {
    return (
      <Card className="border-emerald-500/30">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Tu Tribu tiene buen equilibrio de roles</p>
            <p className="text-xs text-muted-foreground">
              Hay referidores, receptores e híbridos. Sigue invitando para cubrir más profesiones.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5" />
          ¿A quién invitar para equilibrar tu Tribu?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Tu Tribu necesita estos perfiles para que el negocio fluya mejor:
        </p>
        {needs.map((need) => (
          <div
            key={need.role}
            className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
          >
            <span className="text-lg">{need.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{need.label}</span>
                {need.count === 0 ? (
                  <Badge variant="destructive" className="text-xs">Ninguno</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Solo {need.count}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{need.examples}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
