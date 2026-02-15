import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Target, Star, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

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

  const isReferMode = total >= 10;

  // Progressive: invite urgency decreases as tribe grows toward 50
  const getProgressMessage = () => {
    if (total >= 50) return 'Tu Tribu está completa — toda la energía en generar negocio.';
    if (total >= 35) return `${total}/50 miembros — casi completa. Cada referencia cuenta.`;
    if (total >= 20) return `${total}/50 miembros — buen tamaño. Refiere mientras seguís creciendo.`;
    if (total >= 10) return `${total}/50 miembros — ya sois viables. Refiere y sigue invitando para crecer.`;
    return `${total}/50 miembros — tu Tribu empieza. Refiere lo que puedas e invita para hacerla crecer rápido.`;
  };
  
  // Invite visual weight: critical <10, secondary 10+, hidden at 50
  const getInviteVariant = (): "default" | "outline" | "secondary" => {
    if (total < 10) return 'default';
    return 'outline';
  };
  const getInviteSize = (): "default" | "sm" => total >= 35 ? 'sm' : 'default';

  if (loading || !chapterId || total === 0) return null;

  // ═══ TRIBU ≥10: MODO REFERIR ═══
  if (isReferMode && needs.length === 0) {
    return (
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Tu Tribu tiene buena variedad — es momento de generar negocio</p>
              <p className="text-xs text-muted-foreground">
                {getProgressMessage()} ¿A quién conoces que necesite algo?
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/recomendacion')} 
            className="w-full gap-2"
          >
            Referir un cliente
            <ArrowRight className="h-4 w-4" />
          </Button>
          {total < 50 && (
            <Button 
              variant={getInviteVariant()}
              size={getInviteSize()}
              onClick={() => navigate('/referrals')} 
              className="w-full gap-2"
            >
              Invitar profesional ({total}/50)
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isReferMode) {
    return (
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Tu Tribu está lista para generar negocio
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {getProgressMessage()}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={() => navigate('/recomendacion')} 
            className="w-full gap-2"
          >
            Referir un cliente
            <ArrowRight className="h-4 w-4" />
          </Button>
          {total < 50 && (
            <>
              {total < 35 && needs.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground text-center">
                    Para seguir creciendo, invita profesionales que faltan:
                  </p>
                  {needs.slice(0, 1).map((need) => (
                    <div
                      key={need.type}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 border-border"
                    >
                      <span className="text-lg">{need.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
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
                </>
              )}
              <Button 
                variant={getInviteVariant()}
                size={getInviteSize()}
                onClick={() => navigate('/referrals')} 
                className="w-full gap-2"
              >
                Invitar profesional ({total}/50)
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // ═══ TRIBU <10: REFERIR + INVITAR URGENTE ═══
  return (
    <Card className={needs.length > 0 ? "border-amber-500/30" : "border-primary/30"}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5" />
          Genera negocio y haz crecer tu Tribu
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {getProgressMessage()}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Referir siempre es el motor */}
        <Button 
          onClick={() => navigate('/recomendacion')} 
          className="w-full gap-2"
        >
          Referir un cliente
          <ArrowRight className="h-4 w-4" />
        </Button>

        {/* Invitar es urgente <10 */}
        {needs.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground font-medium">
              ⚡ Tu Tribu necesita crecer — invita estos perfiles para que las referencias fluyan:
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
          </>
        )}
        {needs.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Tu Tribu tiene buena variedad. Sigue invitando para llegar a 50 y maximizar oportunidades.
          </p>
        )}
        <p className="text-xs text-muted-foreground italic pt-1">
          💡 Piensa en tus contactos: cada profesión nueva multiplica las oportunidades de negocio para toda la Tribu.
        </p>
        <Button 
          variant={getInviteVariant()}
          size={getInviteSize()}
          onClick={() => navigate('/referrals')} 
          className="w-full gap-2"
        >
          Invitar profesional ({total}/50)
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}