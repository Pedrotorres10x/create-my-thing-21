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
  const isNational = name === "Todoterreno";
  const yearlyDiscount = priceYearly && priceMonthly ? ((priceMonthly * 12 - priceYearly) / (priceMonthly * 12) * 100).toFixed(0) : 0;
  const monthlySavings = priceYearly && priceMonthly ? ((priceMonthly * 12 - priceYearly) / 12).toFixed(2) : 0;

  return (
    <Card className={`relative ${isRecommended ? 'border-primary shadow-lg sm:scale-105 ring-2 ring-primary/20' : ''} ${isNational ? 'bg-gradient-to-br from-primary/5 to-primary/10' : ''} transition-all hover:shadow-xl flex flex-col`}>
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
      
      <CardHeader className="pb-4">
        <CardTitle className="text-xl sm:text-2xl">{name}</CardTitle>
        {description && (
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 flex-1">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold">
              {isFree ? "Gratis" : `${priceMonthly}€`}
            </span>
            {!isFree && <span className="text-sm sm:text-base text-muted-foreground">/mes</span>}
          </div>
          {!isFree && priceYearly && (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] sm:text-xs font-semibold">
                  Ahorra {yearlyDiscount}%
                </Badge>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  pago anual • Solo {(priceYearly / 12).toFixed(2)}€/mes
                </p>
              </div>
              <p className="text-[10px] sm:text-xs text-primary font-medium">
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

        <ul className="space-y-2 sm:space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 sm:gap-3">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4 sm:pt-6">
        <Button
          className="w-full text-sm sm:text-base"
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
