import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircleWarning } from "lucide-react";

interface DisagreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  onSuccess?: () => void;
}

const REASONS = [
  { value: "value_not_reflected", label: "El valor no refleja la operación real" },
  { value: "partial_scope", label: "El alcance fue parcial" },
  { value: "different_margin_model", label: "Mi modelo de margen es diferente" },
  { value: "other", label: "Otro motivo" },
];

export const DisagreementDialog = ({
  open,
  onOpenChange,
  dealId,
  onSuccess,
}: DisagreementDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason || comment.trim().length < 20) return;

    setLoading(true);
    try {
      // Get professional id
      const { data: prof } = await (supabase as any)
        .from("professionals")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!prof) throw new Error("Professional not found");

      const { error } = await (supabase as any)
        .from("deal_disagreements")
        .insert({
          deal_id: dealId,
          opened_by_id: prof.id,
          reason,
          comment: comment.trim(),
        });

      if (error) throw error;

      toast({
        title: "Desacuerdo registrado",
        description: "Tu comentario ha sido registrado. Revisaremos la situación.",
      });
      setReason("");
      setComment("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el desacuerdo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircleWarning className="h-5 w-5 text-amber-500" />
            No somos perfectos
          </DialogTitle>
          <DialogDescription>
            Si la categoría o el agradecimiento no reflejan la realidad de la operación, cuéntanoslo. Tu opinión nos ayuda a mejorar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>¿Qué ha ocurrido?</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Explícanos (mín. 20 caracteres)</Label>
            <Textarea
              placeholder="Cuéntanos qué ha pasado para que podamos ajustar..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
            {comment.length > 0 && comment.length < 20 && (
              <p className="text-xs text-destructive">
                Necesitas al menos 20 caracteres ({20 - comment.length} más)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !reason || comment.trim().length < 20}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
