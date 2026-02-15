import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Target, Star } from 'lucide-react';

interface SpecNeed {
  type: 'proximity' | 'services' | 'versatile';
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
  const [needs, setNeeds] = useState<SpecNeed[]>([]);
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

      // Calculate ideal composition
      const idealProximity = Math.round(t * 0.4);
      const idealServices = Math.round(t * 0.4);
      const idealVersatile = Math.round(t * 0.2);

      const specNeeds: SpecNeed[] = [];

      // Proximity businesses (mapped from referrers)
      const proxGap = idealProximity - referrers;
      if (referrers === 0) {
        specNeeds.push({
          type: 'proximity',
          label: 'Negocios de proximidad',
          emoji: '🏪',
          count: 0,
          total: idealProximity,
          examples: 'Bares, restaurantes, gimnasios, peluquerías, tiendas, farmacias… Profesionales con gran tráfico de clientes que detectan necesidades.',
          priority: 'critical',
        });
      } else if (proxGap >= 2) {
        specNeeds.push({
          type: 'proximity',
          label: 'Más negocios de proximidad',
          emoji: '🏪',
          count: referrers,
          total: idealProximity,
          examples: 'Peluquerías, fisioterapeutas, farmacias… Negocios que ven muchos clientes al día.',
          priority: proxGap >= 3 ? 'critical' : 'medium',
        });
      }

      // Professional services (mapped from receivers)
      const svcGap = idealServices - receivers;
      if (receivers === 0) {
        specNeeds.push({
          type: 'services',
          label: 'Profesionales de servicios',
          emoji: '💼',
          count: 0,
          total: idealServices,
          examples: 'Abogados, arquitectos, asesores financieros, inmobiliarias… Profesionales que cierran tratos de alto valor.',
          priority: 'critical',
        });
      } else if (svcGap >= 2) {
        specNeeds.push({
          type: 'services',
          label: 'Más profesionales de servicios',
          emoji: '💼',
          count: receivers,
          total: idealServices,
          examples: 'Servicios profesionales especializados que conviertan oportunidades en negocio.',
          priority: svcGap >= 3 ? 'critical' : 'medium',
        });
      }

      // Versatile profiles (mapped from hybrids)
      if (hybrids === 0 && t >= 8) {
        specNeeds.push({
          type: 'versatile',
          label: 'Perfiles versátiles',
          emoji: '🔗',
          count: 0,
          total: idealVersatile,
          examples: 'Marketing, diseño, coaching, contabilidad… Profesionales que conectan con todo tipo de clientes.',
          priority: 'medium',
        });
      }

      // Sort by priority
      const priorityOrder = { critical: 0, medium: 1, low: 2 };
      specNeeds.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setNeeds(specNeeds);
    } catch (e) {
      console.error('Error loading tribe needs:', e);
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
            <p className="text-sm font-medium">Tu Tribu tiene buena variedad de perfiles</p>
            <p className="text-xs text-muted-foreground">
              Hay negocios de proximidad, servicios profesionales y perfiles versátiles. Sigue invitando para cubrir más profesiones.
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
          ¿A quién invitar para que tu Tribu crezca mejor?
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Tu Tribu tiene {total} miembros. Cuanta más variedad, más negocio para todos.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Prioriza invitar estos tipos de profesionales para que las recomendaciones fluyan:
        </p>
        {needs.map((need, i) => (
          <div
            key={need.type}
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
                    {need.count} de {need.total} ideales
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{need.examples}</p>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground italic pt-1">
          💡 Piensa en tus contactos: ¿quién encaja en estos perfiles? Cada profesión nueva multiplica las oportunidades de negocio para toda la Tribu.
        </p>
      </CardContent>
    </Card>
  );
}
