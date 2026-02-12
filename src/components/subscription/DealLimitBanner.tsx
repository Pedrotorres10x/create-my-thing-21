import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

interface DealLimitBannerProps {
  dealsCompleted: number;
  maxFreeDeals: number;
  totalEarnings: number;
  onUpgrade: () => void;
}

export const DealLimitBanner = ({ dealsCompleted, maxFreeDeals, totalEarnings, onUpgrade }: DealLimitBannerProps) => {
  const remaining = maxFreeDeals - dealsCompleted;
  
  if (dealsCompleted === 0) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
  };

  // After using free deals - subtle lock message
  if (remaining <= 0) {
    return (
      <Card className="border-primary/30 bg-primary/5 cursor-pointer hover:shadow-md transition-shadow" onClick={onUpgrade}>
        <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Has generado {formatCurrency(totalEarnings)}</span>
              <span className="text-muted-foreground"> con tus tratos gratis. Desbloquea ilimitados por 99€/mes.</span>
            </p>
          </div>
          <Badge variant="outline" className="flex-shrink-0 text-xs">Desbloquear</Badge>
        </CardContent>
      </Card>
    );
  }

  // Still has free deals - very subtle counter
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
      <span>
        {remaining === 1 ? "Te queda 1 trato gratis" : `Te quedan ${remaining} tratos gratis`}
        {totalEarnings > 0 && ` · ${formatCurrency(totalEarnings)} generados`}
      </span>
    </div>
  );
};
