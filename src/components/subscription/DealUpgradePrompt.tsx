import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TrendingUp, ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DealUpgradePromptProps {
  totalEarnings: number;
  dealsCompleted: number;
  open: boolean;
  onClose: () => void;
}

export const DealUpgradePrompt = ({ totalEarnings, dealsCompleted, open, onClose }: DealUpgradePromptProps) => {
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
  };

  const roi = totalEarnings > 0 ? Math.round(totalEarnings / 99) : 0;

  const handleUpgrade = () => {
    onClose();
    navigate("/profile?tab=plan");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-none shadow-2xl overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 space-y-6 py-2">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>

          <DialogTitle className="text-center text-2xl font-bold">
            Has generado {formatCurrency(totalEarnings)} en {dealsCompleted} trato{dealsCompleted > 1 ? 's' : ''}
          </DialogTitle>

          <DialogDescription className="text-center text-base text-foreground/80 leading-relaxed">
            Tu red ya te ha traído negocio real. Con 99€/mes desbloqueas tratos ilimitados.
            {roi > 1 && (
              <span className="block mt-2 font-medium text-primary">
                Eso es {roi}x lo que cuesta la cuota. Con un solo trato más la recuperas.
              </span>
            )}
          </DialogDescription>

          {/* The killer stat */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Estás pagando por</p>
              <p className="text-lg font-bold">Un equipo de comerciales a 99€/mes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sin comisiones. Sin intermediarios. Solo profesionales que te recomiendan.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleUpgrade}
              size="lg"
              className="w-full gap-2"
            >
              <Zap className="h-4 w-4" />
              Desbloquear tratos ilimitados
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="text-muted-foreground text-sm"
            >
              Ahora no
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
