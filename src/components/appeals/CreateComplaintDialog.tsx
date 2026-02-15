import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateComplaintDialogProps {
  professionalId: string;
  onSuccess?: () => void;
}

const complaintTypes = [
  { value: "sanction_appeal", label: "Apelar una sanción" },
  { value: "member_complaint", label: "Queja sobre un miembro" },
  { value: "platform_issue", label: "Problema con la plataforma" },
  { value: "other", label: "Otro motivo" },
];

export function CreateComplaintDialog({ professionalId, onSuccess }: CreateComplaintDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [reason, setReason] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !type) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('penalty_appeals')
        .insert({
          professional_id: professionalId,
          penalty_id: professionalId, // Self-reference for general complaints
          appeal_reason: `[${complaintTypes.find(t => t.value === type)?.label}] ${reason.trim()}`,
          additional_context: context.trim() || null,
          status: 'pending',
        });

      if (error) throw error;

      toast.success("Tu queja ha sido enviada. La revisaremos lo antes posible.");
      setType("");
      setReason("");
      setContext("");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating complaint:', error);
      toast.error("No se pudo enviar la queja. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Iniciar queja o apelación
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva queja o apelación</DialogTitle>
          <DialogDescription>
            Cuéntanos qué ha pasado. Revisaremos tu caso y te responderemos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de queja <span className="text-destructive">*</span></Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el motivo" />
              </SelectTrigger>
              <SelectContent>
                {complaintTypes.map(ct => (
                  <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complaint-reason">
              Descripción <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="complaint-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica tu situación con el mayor detalle posible..."
              rows={4}
              required
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">{reason.length}/1000</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complaint-context">Contexto adicional (opcional)</Label>
            <Textarea
              id="complaint-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Nombres, fechas, capturas... cualquier dato que ayude a resolver tu caso"
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !reason.trim() || !type}>
              {loading ? "Enviando..." : "Enviar queja"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
