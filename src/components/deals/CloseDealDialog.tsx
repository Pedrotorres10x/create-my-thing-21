import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CloseDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  onSuccess?: () => void;
}

export const CloseDealDialog = ({ open, onOpenChange, dealId, onSuccess }: CloseDealDialogProps) => {
  const [profit, setProfit] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const commission = useMemo(() => {
    const val = parseFloat(profit);
    return isNaN(val) ? 0 : val * 0.1;
  }, [profit]);

  const handleClose = async () => {
    const profitVal = parseFloat(profit);
    if (isNaN(profitVal) || profitVal <= 0) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("deals")
        .update({
          status: "completed",
          declared_profit: profitVal,
          deal_value: profitVal,
        })
        .eq("id", dealId);

      if (error) throw error;

      toast({
        title: "Trato cerrado",
        description: `Beneficio declarado: ${profitVal.toFixed(2)}€. Comisión: ${(profitVal * 0.1).toFixed(2)}€`,
      });
      setProfit("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cerrar el trato",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar trato y declarar beneficio</DialogTitle>
          <DialogDescription>
            Indica cuánto has ganado con este trato. Se calculará automáticamente el 10% de comisión para el recomendador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profit">Beneficio obtenido (€)</Label>
            <Input
              id="profit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={profit}
              onChange={(e) => setProfit(e.target.value)}
            />
          </div>
          {commission > 0 && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-1">
              <p className="text-sm text-muted-foreground">Comisión para el recomendador (10%)</p>
              <p className="text-2xl font-bold text-primary">{commission.toFixed(2)}€</p>
              <p className="text-xs text-muted-foreground">Tendrás 30 días para abonar esta comisión</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleClose} disabled={loading || !profit || parseFloat(profit) <= 0}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Cierre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
