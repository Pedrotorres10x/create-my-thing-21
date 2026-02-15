import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Target, Star } from 'lucide-react';

interface RoleNeed {
  role: string;
  label: string;
  emoji: string;
  count: number;
  total: number;
  examples: string;
  priority: 'critical' | 'medium' | 'low';
}

interface TribeRoleNeedsProps {
  chapterId: string | null;
}

export function TribeRoleNeeds({ chapterId }: TribeRoleNeedsProps) {
  const [needs, setNeeds] = useState<RoleNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [idealRatio, setIdealRatio] = useState('');

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

      // Calculate ideal ratio: ~40% referrers, ~40% receivers, ~20% hybrids
      const idealRef = Math.round(t * 0.4);
      const idealRec = Math.round(t * 0.4);
      const idealHyb = Math.round(t * 0.2);
      setIdealRatio(`Ideal: ~${idealRef} ref / ~${idealRec} rec / ~${idealHyb} híb`);

      const roleNeeds: RoleNeed[] = [];

      // Referrers analysis
      const refGap = idealRef - referrers;
      if (referrers === 0) {
        roleNeeds.push({
          role: 'referrer',
          label: 'Referidores',
          emoji: '📡',
          count: 0,
          total: idealRef,
          examples: 'Bares, restaurantes, gimnasios, tiendas, nutricionistas… Profesionales que detectan necesidades en sus clientes y las derivan.',
          priority: 'critical',
        });
      } else if (refGap >= 2) {
        roleNeeds.push({
          role: 'referrer',
          label: 'Más referidores',
          emoji: '📡',
          count: referrers,
          total: idealRef,
          examples: 'Negocios de proximidad que generen leads: peluquerías, fisios, farmacias…',
          priority: refGap >= 3 ? 'critical' : 'medium',
        });
      }

      // Receivers analysis
      const recGap = idealRec - receivers;
      if (receivers === 0) {
        roleNeeds.push({
          role: 'receiver',
          label: 'Receptores',
          emoji: '🎯',
          count: 0,
          total: idealRec,
          examples: 'Abogados, arquitectos, asesores financieros, inmobiliarias… Profesionales que cierran tratos de alto valor.',
          priority: 'critical',
        });
      } else if (recGap >= 2) {
        roleNeeds.push({
          role: 'receiver',
          label: 'Más receptores',
          emoji: '🎯',
          count: receivers,
          total: idealRec,
          examples: 'Servicios profesionales que conviertan leads en negocio cerrado.',
          priority: recGap >= 3 ? 'critical' : 'medium',
        });
      }

      // Hybrids analysis
      if (hybrids === 0 && t >= 8) {
        roleNeeds.push({
          role: 'hybrid',
          label: 'Híbridos',
          emoji: '🔄',
          count: 0,
          total: idealHyb,
          examples: 'Marketing, diseño, coaching, contabilidad… Profesionales versátiles que refieren y reciben.',
          priority: 'medium',
        });
      }

      // Sort by priority
      const priorityOrder = { critical: 0, medium: 1, low: 2 };
      roleNeeds.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

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
        <p className="text-xs text-muted-foreground mt-1">
          Tu Tribu tiene {total} miembros. {idealRatio}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Prioriza invitar estos perfiles para que los referidos fluyan mejor y todos cerréis más negocio:
        </p>
        {needs.map((need, i) => (
          <div
            key={need.role}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              need.priority === 'critical'
                ? 'bg-destructive/5 border-destructive/20'
                : 'bg-amber-500/5 border-amber-500/20'
            }`}
          >
            <span className="text-lg">{need.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {i === 0 && (
                  <Badge variant="default" className="text-xs gap-1">
                    <Star className="h-3 w-3" />
                    Prioridad #1
                  </Badge>
                )}
                <span className="text-sm font-semibold">{need.label}</span>
                {need.count === 0 ? (
                  <Badge variant="destructive" className="text-xs">Ninguno</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {need.count}/{need.total} (faltan {need.total - need.count})
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{need.examples}</p>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground italic pt-1">
          💡 Piensa en tus contactos: ¿quién encaja en estos perfiles? Cada rol que cubras multiplica las oportunidades de negocio para toda la Tribu.
        </p>
      </CardContent>
    </Card>
  );
}
