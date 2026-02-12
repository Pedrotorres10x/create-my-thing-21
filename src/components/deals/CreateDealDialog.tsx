import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverId: string;
  receiverName: string;
  referrerId: string;
  onSuccess?: () => void;
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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!description.trim()) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("deals")
        .insert({
          referrer_id: referrerId,
          receiver_id: receiverId,
          description: description.trim(),
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Referencia enviada",
        description: `Se ha enviado la referencia a ${receiverName}`,
      });
      setDescription("");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Referir un cliente a {receiverName}</DialogTitle>
          <DialogDescription>
            Describe el contacto que le pasas y qué servicio necesita. {receiverName} recibirá la notificación.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Ej: Mi vecino Juan necesita un abogado para una herencia. Su teléfono es 612 345 678."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !description.trim()}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar Referencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
