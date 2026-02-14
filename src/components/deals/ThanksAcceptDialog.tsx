import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Heart, CheckCircle } from "lucide-react";
import { DisagreementDialog } from "./DisagreementDialog";

interface ThanksAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  amount: number;
  bandLabel: string;
  payerName: string;
  onSuccess?: () => void;
}

export const ThanksAcceptDialog = ({
  open,
  onOpenChange,
  dealId,
  amount,
  bandLabel,
  payerName,
  onSuccess,
}: ThanksAcceptDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [disagreementOpen, setDisagreementOpen] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("deals")
        .update({
          thanks_amount_status: "accepted",
          thanks_accepted_at: new Date().toISOString(),
        })
        .eq("id", dealId);

      if (error) throw error;

      toast({
        title: "¡Agradecimiento aceptado!",
        description: `Has aceptado ${amount}€ de agradecimiento de ${payerName}.`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo aceptar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Agradecimiento propuesto
            </DialogTitle>
            <DialogDescription>
              {payerName} te propone un agradecimiento por tu referencia.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/50 p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">{bandLabel}</p>
            <p className="text-4xl font-bold text-primary">{amount}€</p>
            <p className="text-xs text-muted-foreground">de agradecimiento</p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleAccept} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Aceptar agradecimiento
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                setDisagreementOpen(true);
              }}
              className="w-full text-muted-foreground"
            >
              No somos perfectos — ¿La categoría o el agradecimiento no reflejan la realidad?
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DisagreementDialog
        open={disagreementOpen}
        onOpenChange={setDisagreementOpen}
        dealId={dealId}
        onSuccess={onSuccess}
      />
    </>
  );
};
