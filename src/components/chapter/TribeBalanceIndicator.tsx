import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UserPlus, AlertTriangle, CheckCircle, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RoleBalance {
  referrers: number;
  receivers: number;
  hybrids: number;
  unknown: number;
  total: number;
}

interface TribeBalanceIndicatorProps {
  balance: RoleBalance;
}

type HealthStatus = 'balanced' | 'needs_referrers' | 'needs_receivers' | 'critical';

function getHealthStatus(balance: RoleBalance): HealthStatus {
  const { referrers, receivers, hybrids, total } = balance;
  if (total < 3) return 'critical';

  // Hybrids count as half for each side
  const effectiveReferrers = referrers + hybrids * 0.5;
  const effectiveReceivers = receivers + hybrids * 0.5;
  const ratio = effectiveReferrers / (effectiveReceivers || 1);

  // Ideal ratio is ~0.4-0.6 referrers per receiver (fewer referrers needed)
  if (ratio < 0.15) return 'needs_referrers';
  if (ratio > 2.5) return 'needs_receivers';
  if (ratio < 0.25 || ratio > 1.8) return ratio < 0.25 ? 'needs_referrers' : 'needs_receivers';
  return 'balanced';
}

function getStatusConfig(status: HealthStatus) {
  switch (status) {
    case 'balanced':
      return {
        icon: CheckCircle,
        label: 'Equilibrado',
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        message: '¡Tu Tribu tiene buen equilibrio! Hay quien genera leads y quien los cierra.',
      };
    case 'needs_referrers':
      return {
        icon: AlertTriangle,
        label: 'Faltan referidores',
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        message: 'Necesitáis más negocios de proximidad (bares, tiendas, gimnasios…) que generen leads para los profesionales de servicios.',
      };
    case 'needs_receivers':
      return {
        icon: AlertTriangle,
        label: 'Faltan receptores',
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        message: 'Necesitáis más profesionales de servicios (abogados, arquitectos, asesores…) que conviertan los leads en negocio.',
      };
    case 'critical':
      return {
        icon: AlertTriangle,
        label: 'Grupo pequeño',
        color: 'text-destructive',
        bg: 'bg-destructive/10',
        border: 'border-destructive/30',
        message: 'Con tan pocos miembros aún no se puede hablar de equilibrio. Invita más profesionales.',
      };
  }
}

export const TribeBalanceIndicator = ({ balance }: TribeBalanceIndicatorProps) => {
  const navigate = useNavigate();
  const status = getHealthStatus(balance);
  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  const { referrers, receivers, hybrids, total } = balance;
  const refPct = total > 0 ? Math.round((referrers / total) * 100) : 0;
  const recPct = total > 0 ? Math.round((receivers / total) * 100) : 0;
  const hybPct = total > 0 ? Math.round((hybrids / total) * 100) : 0;

  return (
    <Card className={`${config.border} border`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-5 w-5" />
          Equilibrio de la Tribu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badge */}
        <div className={`flex items-start gap-3 p-3 rounded-lg ${config.bg}`}>
          <StatusIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color}`} />
          <div>
            <Badge variant="outline" className={`${config.color} mb-1`}>
              {config.label}
            </Badge>
            <p className="text-sm text-muted-foreground">{config.message}</p>
          </div>
        </div>

        {/* Distribution bars */}
        <div className="space-y-3">
          <RoleBar
            label="Referidores"
            description="Generan leads"
            count={referrers}
            percentage={refPct}
            color="bg-blue-500"
          />
          <RoleBar
            label="Receptores"
            description="Reciben y cierran"
            count={receivers}
            percentage={recPct}
            color="bg-primary"
          />
          <RoleBar
            label="Híbridos"
            description="Generan y reciben"
            count={hybrids}
            percentage={hybPct}
            color="bg-emerald-500"
          />
        </div>

        {/* CTA if unbalanced */}
        {status !== 'balanced' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate('/referrals')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {status === 'needs_referrers'
              ? 'Invitar negocios de proximidad'
              : status === 'needs_receivers'
              ? 'Invitar profesionales de servicios'
              : 'Invitar profesionales'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

function RoleBar({
  label,
  description,
  count,
  percentage,
  color,
}: {
  label: string;
  description: string;
  count: number;
  percentage: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground ml-1.5">({description})</span>
        </div>
        <span className="text-sm font-semibold">{count} <span className="text-xs text-muted-foreground font-normal">({percentage}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
