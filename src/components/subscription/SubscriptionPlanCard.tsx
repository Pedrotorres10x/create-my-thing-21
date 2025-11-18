import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

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

  return (
    <Card className={`relative ${isRecommended ? 'border-primary shadow-lg' : ''}`}>
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">Recomendado</Badge>
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="text-2xl">{name}</CardTitle>
        {description && (
          <CardDescription className="text-sm">{description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">
              {isFree ? "Gratis" : `${priceMonthly}€`}
            </span>
            {!isFree && <span className="text-muted-foreground">/mes</span>}
          </div>
          {!isFree && priceYearly && (
            <p className="text-sm text-muted-foreground">
              o {priceYearly}€/año (ahorra {((priceMonthly! * 12 - priceYearly) / (priceMonthly! * 12) * 100).toFixed(0)}%)
            </p>
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
        >
          {isCurrentPlan ? "Plan actual" : isFree ? "Comenzar gratis" : "Actualizar plan"}
        </Button>
      </CardFooter>
    </Card>
  );
}
