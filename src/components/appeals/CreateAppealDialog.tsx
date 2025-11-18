import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAppealManagement } from "@/hooks/useAppealManagement";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateAppealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  penaltyId: string;
  professionalId: string;
  penaltyReason: string;
  onSuccess?: () => void;
}

export function CreateAppealDialog({
  open,
  onOpenChange,
  penaltyId,
  professionalId,
  penaltyReason,
  onSuccess,
}: CreateAppealDialogProps) {
  const [appealReason, setAppealReason] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const { loading, createAppeal } = useAppealManagement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appealReason.trim()) {
      return;
    }

    const success = await createAppeal({
      penaltyId,
      professionalId,
      appealReason: appealReason.trim(),
      additionalContext: additionalContext.trim() || undefined,
    });

    if (success) {
      setAppealReason("");
      setAdditionalContext("");
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apelar Sanción</DialogTitle>
          <DialogDescription>
            Explica por qué consideras que esta sanción es injusta o debería ser revisada.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Motivo de la sanción:</strong> {penaltyReason}
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appeal-reason">
              Motivo de la apelación <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="appeal-reason"
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Explica por qué crees que esta sanción no es justa..."
              rows={4}
              required
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {appealReason.length}/1000 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional-context">Contexto adicional (opcional)</Label>
            <Textarea
              id="additional-context"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Proporciona cualquier información adicional que pueda ayudar en la revisión..."
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {additionalContext.length}/1000 caracteres
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !appealReason.trim()}>
              {loading ? "Enviando..." : "Enviar Apelación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
