import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, TrendingUp, Zap } from "lucide-react";

interface SubscriptionPlanCardProps {
  name: string;
  description: string | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  features: string[];
  isCurrentPlan: boolean;
  isRecommended?: boolean;
  onSelect: () => void;
}

export function SubscriptionPlanCard({
  name,
  description,
  priceMonthly,
  priceYearly,
  features,
  isCurrentPlan,
  isRecommended,
  onSelect,
}: SubscriptionPlanCardProps) {
  const isFree = priceMonthly === 0;
  const isNational = name === "Nacional";
  const yearlyDiscount = priceYearly && priceMonthly ? ((priceMonthly * 12 - priceYearly) / (priceMonthly * 12) * 100).toFixed(0) : 0;
  const monthlySavings = priceYearly && priceMonthly ? ((priceMonthly * 12 - priceYearly) / 12).toFixed(2) : 0;

  return (
    <Card className={`relative ${isRecommended ? 'border-primary shadow-lg scale-105 ring-2 ring-primary/20' : ''} ${isNational ? 'bg-gradient-to-br from-primary/5 to-primary/10' : ''} transition-all hover:shadow-xl`}>
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
          <Badge className="bg-primary text-primary-foreground shadow-md">
            <Zap className="w-3 h-3 mr-1" />
            Mejor Valor
          </Badge>
        </div>
      )}
      {isNational && !isRecommended && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80">
          <TrendingUp className="w-3 h-3 mr-1" />
          Máximo ROI
        </Badge>
      )}
      
      <CardHeader>
        <CardTitle className="text-2xl">{name}</CardTitle>
        {description && (
          <CardDescription className="text-sm">{description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">
              {isFree ? "Gratis" : `${priceMonthly}€`}
            </span>
            {!isFree && <span className="text-muted-foreground">/mes</span>}
          </div>
          {!isFree && priceYearly && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs font-semibold">
                  Ahorra {yearlyDiscount}%
                </Badge>
                <p className="text-sm text-muted-foreground">
                  pago anual • Solo {(priceYearly / 12).toFixed(2)}€/mes
                </p>
              </div>
              <p className="text-xs text-primary font-medium">
                ✨ Ahorras {monthlySavings}€/mes = {((priceMonthly! * 12 - priceYearly) / priceMonthly!).toFixed(1)} meses gratis
              </p>
            </div>
          )}
          {isNational && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary">
                💡 ROI promedio: 3.5x en primeros 6 meses
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Basado en datos de 200+ miembros activos
              </p>
            </div>
          )}
        </div>

        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrentPlan ? "outline" : isRecommended ? "default" : "secondary"}
          disabled={isCurrentPlan}
          onClick={onSelect}
          size={isRecommended ? "lg" : "default"}
        >
          {isCurrentPlan ? "Plan actual" : isFree ? "Comenzar gratis" : isNational ? "Desbloquear todo 🚀" : "Actualizar plan"}
        </Button>
      </CardFooter>
    </Card>
  );
}
