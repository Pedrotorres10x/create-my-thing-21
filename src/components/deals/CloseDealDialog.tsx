import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Heart, Tag } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface CloseDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  onSuccess?: () => void;
}

interface BandInfo {
  display_label: string;
  min_thanks_amount: number;
  recommended_thanks_amount: number;
  max_thanks_amount: number;
}

export const CloseDealDialog = ({ open, onOpenChange, dealId, onSuccess }: CloseDealDialogProps) => {
  const [band, setBand] = useState<BandInfo | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingBand, setLoadingBand] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open && dealId) fetchDealBand();
  }, [open, dealId]);

  const fetchDealBand = async () => {
    setLoadingBand(true);
    const { data: deal } = await (supabase as any)
      .from("deals")
      .select("thanks_band_id, thanks_category_bands(display_label, min_thanks_amount, recommended_thanks_amount, max_thanks_amount)")
      .eq("id", dealId)
      .single();

    if (deal?.thanks_category_bands) {
      const b = deal.thanks_category_bands;
      setBand(b);
      setSelectedAmount(b.recommended_thanks_amount);
    } else {
      setBand(null);
    }
    setLoadingBand(false);
  };

  const handleClose = async () => {
    if (!band) return;
    setLoading(true);
    try {
      // Get current user's professional id
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: myProf } = await (supabase as any)
        .from("professionals")
        .select("id")
        .eq("user_id", currentUser?.id)
        .single();

      const { error } = await (supabase as any)
        .from("deals")
        .update({
          status: "pending_close",
          thanks_amount_selected: selectedAmount,
          thanks_amount_status: "proposed",
          thanks_proposed_at: new Date().toISOString(),
          close_initiated_by: myProf?.id,
        })
        .eq("id", dealId);

      if (error) throw error;

      toast({
        title: "Cierre propuesto",
        description: `Has propuesto cerrar con ${selectedAmount}€ de agradecimiento. La otra parte debe confirmar.`,
      });
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

  const sliderPercent = band
    ? ((selectedAmount - band.min_thanks_amount) / (band.max_thanks_amount - band.min_thanks_amount)) * 100
    : 0;

  const getGenerosityLabel = () => {
    if (!band) return "";
    if (selectedAmount >= band.recommended_thanks_amount * 1.1) return "🙏 Muy generoso";
    if (selectedAmount >= band.recommended_thanks_amount) return "👍 Generoso";
    if (selectedAmount >= band.min_thanks_amount * 1.2) return "Estándar";
    return "Mínimo";
  };

  if (loadingBand) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!band) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No se puede cerrar</DialogTitle>
            <DialogDescription>
              Este trato no tiene una categoría de agradecimiento asignada. Contacta con soporte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Proponer agradecimiento
          </DialogTitle>
          <DialogDescription>
            El trato ha fructificado. Elige cuánto quieres agradecer al recomendador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Tag className="h-4 w-4 text-primary" />
            <span className="font-medium">{band.display_label}</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mínimo: {band.min_thanks_amount}€</span>
              <span>Máximo: {band.max_thanks_amount}€</span>
            </div>
            <Slider
              value={[selectedAmount]}
              onValueChange={([v]) => setSelectedAmount(v)}
              min={band.min_thanks_amount}
              max={band.max_thanks_amount}
              step={10}
              className="w-full"
            />
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{selectedAmount}€</p>
              <p className="text-xs text-muted-foreground mt-1">
                Recomendado: {band.recommended_thanks_amount}€ · {getGenerosityLabel()}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleClose} disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Proponer {selectedAmount}€ de agradecimiento
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="w-full">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
