import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

type HealthStatus = 'balanced' | 'needs_proximity' | 'needs_services' | 'critical';

function getHealthStatus(balance: RoleBalance): HealthStatus {
  const { referrers, receivers, hybrids, total } = balance;
  if (total < 3) return 'critical';

  const effectiveReferrers = referrers + hybrids * 0.5;
  const effectiveReceivers = receivers + hybrids * 0.5;
  const ratio = effectiveReferrers / (effectiveReceivers || 1);

  if (ratio < 0.15) return 'needs_proximity';
  if (ratio > 2.5) return 'needs_services';
  if (ratio < 0.25) return 'needs_proximity';
  if (ratio > 1.8) return 'needs_services';
  return 'balanced';
}

function getStatusConfig(status: HealthStatus) {
  switch (status) {
    case 'balanced':
      return {
        icon: CheckCircle,
        label: 'Buena variedad',
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        message: '¡Tu Tribu tiene buena variedad de perfiles! Hay quien detecta oportunidades y quien las cierra.',
      };
    case 'needs_proximity':
      return {
        icon: AlertTriangle,
        label: 'Faltan negocios de proximidad',
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        message: 'Necesitáis más negocios con tráfico de clientes (bares, tiendas, gimnasios…) que detecten oportunidades para los profesionales de servicios.',
      };
    case 'needs_services':
      return {
        icon: AlertTriangle,
        label: 'Faltan profesionales de servicios',
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        message: 'Necesitáis más profesionales especializados (abogados, arquitectos, asesores…) que conviertan las oportunidades en negocio.',
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
  const proxPct = total > 0 ? Math.round((referrers / total) * 100) : 0;
  const svcPct = total > 0 ? Math.round((receivers / total) * 100) : 0;
  const versPct = total > 0 ? Math.round((hybrids / total) * 100) : 0;

  return (
    <Card className={`${config.border} border`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-5 w-5" />
          Variedad de la Tribu
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
          <ProfileBar
            label="Negocios de proximidad"
            description="Detectan oportunidades"
            count={referrers}
            percentage={proxPct}
            color="bg-blue-500"
          />
          <ProfileBar
            label="Servicios profesionales"
            description="Cierran negocio"
            count={receivers}
            percentage={svcPct}
            color="bg-primary"
          />
          <ProfileBar
            label="Perfiles versátiles"
            description="Conectan todo"
            count={hybrids}
            percentage={versPct}
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
            {status === 'needs_proximity'
              ? 'Invitar negocios de proximidad'
              : status === 'needs_services'
              ? 'Invitar profesionales de servicios'
              : 'Invitar profesionales'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

function ProfileBar({
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
