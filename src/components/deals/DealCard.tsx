import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, AlertTriangle, CreditCard } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { CloseDealDialog } from "./CloseDealDialog";

interface Deal {
  id: string;
  description: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  declared_profit: number | null;
  commission_amount: number | null;
  commission_status: string;
  commission_due_date: string | null;
  commission_paid_at: string | null;
  deal_value: number | null;
  referrer: { full_name: string } | null;
  receiver: { full_name: string } | null;
}

interface DealCardProps {
  deal: Deal;
  perspective: "referrer" | "receiver";
  myProfessionalId: string;
  onRefresh?: () => void;
}

export const DealCard = ({ deal, perspective, myProfessionalId, onRefresh }: DealCardProps) => {
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const otherParty = perspective === "referrer" ? deal.receiver?.full_name : deal.referrer?.full_name;
  const roleLabel = perspective === "referrer" ? "Enviado a" : "Recibido de";

  const daysRemaining = deal.commission_due_date
    ? differenceInDays(new Date(deal.commission_due_date), new Date())
    : null;

  const isOverdue = deal.commission_status === "overdue" || (daysRemaining !== null && daysRemaining < 0);
  const isUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;

  const getStatusBadge = () => {
    switch (deal.status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case "confirmed":
        return <Badge className="bg-secondary text-secondary-foreground"><CheckCircle className="w-3 h-3 mr-1" />Confirmado</Badge>;
      case "completed":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Completado</Badge>;
      default:
        return <Badge variant="outline">{deal.status}</Badge>;
    }
  };

  const getCommissionBadge = () => {
    if (deal.status !== "completed") return null;
    if (deal.commission_status === "paid") {
      return <Badge className="bg-primary text-primary-foreground"><CheckCircle className="w-3 h-3 mr-1" />Pagado</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Vencido</Badge>;
    }
    if (isUrgent) {
      return <Badge variant="secondary" className="border-destructive text-destructive"><Clock className="w-3 h-3 mr-1" />{daysRemaining}d restantes</Badge>;
    }
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{daysRemaining}d para pagar</Badge>;
  };

  const canConfirm = deal.status === "pending" && perspective === "receiver";
  const canClose = deal.status === "confirmed" && perspective === "receiver";
  const showPayButton = deal.status === "completed" && deal.commission_status !== "paid" && perspective === "receiver";

  const handleConfirm = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).from("deals").update({ status: "confirmed" }).eq("id", deal.id);
    onRefresh?.();
  };

  return (
    <>
      <Card className={`${isOverdue ? "border-destructive" : isUrgent ? "border-amber-500" : ""}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
              <p className="font-semibold text-sm truncate">{otherParty}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {getStatusBadge()}
              {getCommissionBadge()}
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{format(new Date(deal.created_at), "d MMM yyyy", { locale: es })}</span>
            {deal.status === "completed" && deal.declared_profit != null && (
              <div className="text-right">
                <span className="block">Beneficio: {deal.declared_profit.toFixed(2)}€</span>
                <span className="block text-primary font-medium">Comisión: {deal.commission_amount?.toFixed(2)}€</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {canConfirm && (
              <Button size="sm" onClick={handleConfirm} className="w-full">
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirmar Trato
              </Button>
            )}
            {canClose && (
              <Button size="sm" onClick={() => setCloseDialogOpen(true)} className="w-full">
                Cerrar y Declarar Beneficio
              </Button>
            )}
            {showPayButton && (
              <Button size="sm" variant="outline" disabled className="w-full">
                <CreditCard className="h-3 w-3 mr-1" />
                Pagar Comisión (Próximamente)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <CloseDealDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        dealId={deal.id}
        onSuccess={onRefresh}
      />
    </>
  );
};
