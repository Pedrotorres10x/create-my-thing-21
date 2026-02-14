import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverId: string;
  receiverName: string;
  referrerId: string;
  onSuccess?: () => void;
}

interface Sector {
  id: string;
  name: string;
}

interface BandResult {
  band_id: string;
  display_label: string;
  min_amount: number;
  recommended_amount: number;
  max_amount: number;
}

export const CreateDealDialog = ({
  open,
  onOpenChange,
  receiverId,
  receiverName,
  referrerId,
  onSuccess,
}: CreateDealDialogProps) => {
  const [description, setDescription] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [volume, setVolume] = useState("");
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [bandResult, setBandResult] = useState<BandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) fetchSectors();
  }, [open]);

  useEffect(() => {
    if (sectorId && volume && parseFloat(volume) > 0) {
      computeBand();
    } else {
      setBandResult(null);
    }
  }, [sectorId, volume]);

  const fetchSectors = async () => {
    setLoadingSectors(true);
    const { data } = await (supabase as any)
      .from("thanks_sectors")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    setSectors(data || []);
    setLoadingSectors(false);
  };

  const computeBand = async () => {
    const vol = parseFloat(volume);
    if (!sectorId || isNaN(vol) || vol <= 0) return;

    const { data, error } = await (supabase as any)
      .rpc("assign_thanks_band", {
        _sector_id: sectorId,
        _estimated_total_volume: vol,
      });

    if (error || !data || data.length === 0) {
      setBandResult(null);
      return;
    }

    setBandResult({
      band_id: data[0].band_id,
      display_label: data[0].display_label,
      min_amount: data[0].min_amount,
      recommended_amount: data[0].recommended_amount,
      max_amount: data[0].max_amount,
    });
  };

  const handleSubmit = async () => {
    if (!description.trim() || !sectorId || !volume) return;

    setLoading(true);
    try {
      // Re-compute band to get internal income (stored server-side only)
      const { data: bandData } = await (supabase as any)
        .rpc("assign_thanks_band", {
          _sector_id: sectorId,
          _estimated_total_volume: parseFloat(volume),
        });

      const band = bandData?.[0];

      const { error } = await (supabase as any)
        .from("deals")
        .insert({
          referrer_id: referrerId,
          receiver_id: receiverId,
          description: description.trim(),
          status: "pending",
          sector_id: sectorId,
          estimated_total_volume: parseFloat(volume),
          thanks_band_id: band?.band_id || null,
          thanks_estimated_income_internal: band?.estimated_income_internal || null,
          thanks_band_version: "v1",
        });

      if (error) throw error;

      toast({
        title: "Referencia enviada",
        description: `Se ha enviado la referencia a ${receiverName}`,
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la referencia",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setSectorId("");
    setVolume("");
    setBandResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Referir un cliente a {receiverName}</DialogTitle>
          <DialogDescription>
            Describe el contacto, selecciona el sector e indica el volumen estimado de la operación.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Sector</Label>
            <Select value={sectorId} onValueChange={setSectorId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingSectors ? "Cargando..." : "Selecciona un sector"} />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Volumen estimado total de la operación (€)</Label>
            <Input
              type="number"
              min="0"
              step="100"
              placeholder="Ej: 150000"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Valor bruto del negocio: precio del inmueble, presupuesto del proyecto, etc.</p>
          </div>

          {bandResult && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{bandResult.display_label}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                El agradecimiento recomendado para esta operación estará entre{" "}
                <span className="font-medium">{bandResult.min_amount}€</span> y{" "}
                <span className="font-medium">{bandResult.max_amount}€</span>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Descripción del contacto</Label>
            <Textarea
              placeholder="Ej: Mi vecino Juan necesita un abogado para una herencia. Su teléfono es 612 345 678."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !description.trim() || !sectorId || !volume || parseFloat(volume) <= 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar Referencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
