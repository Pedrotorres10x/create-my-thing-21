import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Phone, MessageCircle, ExternalLink, Building, MapPin } from "lucide-react";
import { usePaymentEvasionDetection } from "@/hooks/usePaymentEvasionDetection";
import { PaymentEvasionWarning } from "@/components/PaymentEvasionWarning";
import { useBehaviorTracking } from "@/hooks/useBehaviorTracking";

interface Offer {
  id: string;
  title: string;
  description: string;
  price_type: string;
  price_amount: number | null;
  contact_preference: string;
  created_at: string;
  professionals: {
    id: string;
    full_name: string;
    photo_url: string | null;
    company_name: string | null;
    position: string | null;
    email: string;
    phone: string | null;
    city: string;
    state: string;
  };
  offer_categories: {
    name: string;
  };
}

interface OfferDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: Offer | null;
  currentProfessionalId: string | null;
}

export function OfferDetailsDialog({
  open,
  onOpenChange,
  offer,
  currentProfessionalId,
}: OfferDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [contacted, setContacted] = useState(false);
  const { analyzing, analyzeContent } = usePaymentEvasionDetection();
  const { trackEvent } = useBehaviorTracking();

  // Track offer view
  useEffect(() => {
    if (open && offer && currentProfessionalId && !isOwnOffer) {
      trackEvent({
        professionalId: currentProfessionalId,
        eventType: 'offer_view',
        contextId: offer.id,
      });
    }
  }, [open, offer?.id]);

  if (!offer) return null;

  const isOwnOffer = currentProfessionalId === offer.professionals.id;

  const getPriceDisplay = () => {
    switch (offer.price_type) {
      case "fixed":
        return `€${offer.price_amount?.toFixed(2)}`;
      case "hourly":
        return `€${offer.price_amount?.toFixed(2)}/hora`;
      case "project":
        return `€${offer.price_amount?.toFixed(2)}/proyecto`;
      case "free":
        return "Gratis";
      case "negotiable":
        return "A negociar";
      default:
        return "N/A";
    }
  };

  const handleContact = async () => {
    if (!currentProfessionalId || isOwnOffer) return;

    setLoading(true);
    try {
      // Detectar si se discute precio en el mensaje
      const pricePatterns = /precio|costo|pago|€|euro|cantidad|presupuesto/i;
      const discussesPrice = pricePatterns.test(message);

      if (discussesPrice) {
        await trackEvent({
          professionalId: currentProfessionalId,
          eventType: 'price_discussed',
          contextId: offer.id,
          metadata: { messageLength: message.length },
        });
      }

      // Analizar contenido antes de enviar
      if (message.trim()) {
        const analysis = await analyzeContent(
          message,
          'contact_message',
          currentProfessionalId,
          offer.id
        );

        // Si es muy alto riesgo (>80), bloquear el envío
        if (analysis && analysis.riskScore > 80) {
          toast.error(
            "⚠️ Mensaje bloqueado: Contenido sospechoso detectado. Los pagos externos están prohibidos."
          );
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("offer_contacts").insert({
        offer_id: offer.id,
        interested_professional_id: currentProfessionalId,
        message: message.trim() || null,
      });

      if (error) throw error;

      // Track successful contact
      await trackEvent({
        professionalId: currentProfessionalId,
        eventType: 'offer_contact',
        contextId: offer.id,
        metadata: { hasMessage: !!message.trim() },
      });

      toast.success("Solicitud de contacto enviada");
      setMessage("");
      setContacted(true);
    } catch (error: any) {
      toast.error(error.message || "Error al enviar solicitud");
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    if (offer.professionals.phone) {
      const msg = encodeURIComponent(
        `Hola ${offer.professionals.full_name}, estoy interesado en tu oferta: ${offer.title}`
      );
      window.open(`https://wa.me/${offer.professionals.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
    }
  };

  const openEmail = () => {
    const subject = encodeURIComponent(`Interés en: ${offer.title}`);
    const body = encodeURIComponent(
      `Hola ${offer.professionals.full_name},\n\nEstoy interesado en tu oferta de servicios: ${offer.title}\n\n`
    );
    window.location.href = `mailto:${offer.professionals.email}?subject=${subject}&body=${body}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-2xl">{offer.title}</DialogTitle>
              <Badge>{offer.offer_categories.name}</Badge>
            </div>
            <DialogDescription className="text-lg font-semibold text-primary">
              {getPriceDisplay()}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Professional Info */}
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
            <Avatar className="h-16 w-16">
              <AvatarImage src={offer.professionals.photo_url || ""} />
              <AvatarFallback>{offer.professionals.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{offer.professionals.full_name}</h3>
              {offer.professionals.position && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {offer.professionals.position}
                  {offer.professionals.company_name && ` en ${offer.professionals.company_name}`}
                </p>
              )}
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {offer.professionals.city}, {offer.professionals.state}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descripción del Servicio</Label>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {offer.description}
            </p>
          </div>

          {/* Contact Section */}
          {!isOwnOffer && currentProfessionalId && (
            <div className="space-y-4 pt-4 border-t">
              <PaymentEvasionWarning />
              
              <Label>Contactar con el Proveedor</Label>

              {!contacted ? (
                <>
                  <Textarea
                    placeholder="Mensaje opcional para el proveedor..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />

                  <div className="flex flex-wrap gap-2">
                    {(offer.contact_preference === "all" || offer.contact_preference === "email") && (
                      <Button
                        onClick={openEmail}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                    )}
                    {(offer.contact_preference === "all" || offer.contact_preference === "whatsapp") &&
                      offer.professionals.phone && (
                        <Button
                          onClick={openWhatsApp}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </Button>
                      )}
                    {(offer.contact_preference === "all" || offer.contact_preference === "phone") &&
                      offer.professionals.phone && (
                        <Button
                          onClick={() => window.open(`tel:${offer.professionals.phone}`)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Phone className="h-4 w-4" />
                          Llamar
                        </Button>
                      )}
                  </div>

                  <Button onClick={handleContact} disabled={loading || analyzing} className="w-full">
                    {(loading || analyzing) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {analyzing ? "Analizando contenido..." : "Enviar Solicitud de Contacto"}
                  </Button>
                </>
              ) : (
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <p className="text-sm font-medium">
                    ✓ Solicitud enviada. El proveedor recibirá tu mensaje.
                  </p>
                </div>
              )}
            </div>
          )}

          {isOwnOffer && (
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-sm text-muted-foreground">
                Esta es tu oferta. Los interesados podrán contactarte directamente.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
