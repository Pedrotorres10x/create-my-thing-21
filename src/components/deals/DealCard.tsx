import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, AlertTriangle, Heart, Tag, MessageCircleWarning } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { CloseDealDialog } from "./CloseDealDialog";
import { ThanksAcceptDialog } from "./ThanksAcceptDialog";
import { DisagreementDialog } from "./DisagreementDialog";

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
  // Thanks fields
  thanks_amount_selected: number | null;
  thanks_amount_status: string;
  thanks_band_id: string | null;
  thanks_category_bands: { display_label: string; min_thanks_amount: number; recommended_thanks_amount: number; max_thanks_amount: number } | null;
  thanks_sectors: { name: string } | null;
  estimated_total_volume: number | null;
}

interface DealCardProps {
  deal: Deal;
  perspective: "referrer" | "receiver";
  myProfessionalId: string;
  onRefresh?: () => void;
}

export const DealCard = ({ deal, perspective, myProfessionalId, onRefresh }: DealCardProps) => {
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [thanksAcceptOpen, setThanksAcceptOpen] = useState(false);
  const [disagreementOpen, setDisagreementOpen] = useState(false);

  const otherParty = perspective === "referrer" ? deal.receiver?.full_name : deal.referrer?.full_name;
  const roleLabel = perspective === "referrer" ? "Enviado a" : "Recibido de";

  const getStatusBadge = () => {
    switch (deal.status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case "confirmed":
        return <Badge className="bg-secondary text-secondary-foreground"><CheckCircle className="w-3 h-3 mr-1" />Confirmado</Badge>;
      case "completed":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Completado</Badge>;
      case "disputed":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />En revisión</Badge>;
      default:
        return <Badge variant="outline">{deal.status}</Badge>;
    }
  };

  const getThanksBadge = () => {
    if (!deal.thanks_amount_selected || deal.thanks_amount_status === "none") return null;
    switch (deal.thanks_amount_status) {
      case "proposed":
        return <Badge variant="secondary"><Heart className="w-3 h-3 mr-1" />{deal.thanks_amount_selected}€ propuesto</Badge>;
      case "accepted":
        return <Badge className="bg-primary text-primary-foreground"><Heart className="w-3 h-3 mr-1" />{deal.thanks_amount_selected}€ aceptado</Badge>;
      case "rejected":
        return <Badge variant="destructive"><MessageCircleWarning className="w-3 h-3 mr-1" />Desacuerdo</Badge>;
      case "paid":
        return <Badge className="bg-primary text-primary-foreground"><CheckCircle className="w-3 h-3 mr-1" />{deal.thanks_amount_selected}€ pagado</Badge>;
      default:
        return null;
    }
  };

  const canConfirm = deal.status === "pending" && perspective === "receiver";
  const canClose = deal.status === "confirmed" && perspective === "receiver";
  const canAcceptThanks = deal.status === "completed" && deal.thanks_amount_status === "proposed" && perspective === "referrer";
  const canDisagree = deal.status !== "disputed" && (deal.thanks_amount_status === "proposed" || deal.thanks_amount_status === "accepted");

  const handleConfirm = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).from("deals").update({ status: "confirmed" }).eq("id", deal.id);
    onRefresh?.();
  };

  return (
    <>
      <Card className={deal.status === "disputed" ? "border-destructive/50" : ""}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
              <p className="font-semibold text-sm truncate">{otherParty}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {getStatusBadge()}
              {getThanksBadge()}
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>

          {/* Sector + Category info */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {deal.thanks_sectors?.name && (
              <Badge variant="outline" className="text-xs">
                {deal.thanks_sectors.name}
              </Badge>
            )}
            {deal.thanks_category_bands?.display_label && (
              <Badge variant="outline" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {deal.thanks_category_bands.display_label}
              </Badge>
            )}
            {deal.estimated_total_volume != null && (
              <span className="text-muted-foreground">
                Vol: {deal.estimated_total_volume.toLocaleString("es-ES")}€
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{format(new Date(deal.created_at), "d MMM yyyy", { locale: es })}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {canConfirm && (
              <Button size="sm" onClick={handleConfirm} className="flex-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirmar Trato
              </Button>
            )}
            {canClose && (
              <Button size="sm" onClick={() => setCloseDialogOpen(true)} className="flex-1">
                <Heart className="h-3 w-3 mr-1" />
                Cerrar y Agradecer
              </Button>
            )}
            {canAcceptThanks && (
              <Button size="sm" onClick={() => setThanksAcceptOpen(true)} className="flex-1">
                <Heart className="h-3 w-3 mr-1" />
                Ver Agradecimiento
              </Button>
            )}
            {canDisagree && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={() => setDisagreementOpen(true)}
              >
                <MessageCircleWarning className="h-3 w-3 mr-1" />
                No somos perfectos
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

      {deal.thanks_amount_selected != null && (
        <ThanksAcceptDialog
          open={thanksAcceptOpen}
          onOpenChange={setThanksAcceptOpen}
          dealId={deal.id}
          amount={deal.thanks_amount_selected}
          bandLabel={deal.thanks_category_bands?.display_label || ""}
          payerName={deal.receiver?.full_name || ""}
          onSuccess={onRefresh}
        />
      )}

      <DisagreementDialog
        open={disagreementOpen}
        onOpenChange={setDisagreementOpen}
        dealId={deal.id}
        onSuccess={onRefresh}
      />
    </>
  );
};
