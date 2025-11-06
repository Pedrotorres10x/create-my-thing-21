import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: string;
  categories: { id: number; name: string }[];
  onSuccess: () => void;
}

export function CreateOfferDialog({
  open,
  onOpenChange,
  professionalId,
  categories,
  onSuccess,
}: CreateOfferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    price_type: "negotiable",
    price_amount: "",
    contact_preference: "all",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.category_id) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("offers").insert({
        professional_id: professionalId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category_id: parseInt(formData.category_id),
        price_type: formData.price_type,
        price_amount: formData.price_amount ? parseFloat(formData.price_amount) : null,
        contact_preference: formData.contact_preference,
      });

      if (error) throw error;

      toast.success("Oferta publicada exitosamente");
      setFormData({
        title: "",
        description: "",
        category_id: "",
        price_type: "negotiable",
        price_amount: "",
        contact_preference: "all",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al publicar la oferta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publicar Nueva Oferta</DialogTitle>
          <DialogDescription>
            Comparte tus servicios con la comunidad CONECTOR
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título de la Oferta *</Label>
            <Input
              id="title"
              placeholder="Ej: Consultoría estratégica de negocios"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              placeholder="Describe tu servicio u oferta en detalle..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              maxLength={1000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/1000 caracteres
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_type">Tipo de Precio *</Label>
              <Select
                value={formData.price_type}
                onValueChange={(value) => setFormData({ ...formData, price_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Precio Fijo</SelectItem>
                  <SelectItem value="hourly">Por Hora</SelectItem>
                  <SelectItem value="project">Por Proyecto</SelectItem>
                  <SelectItem value="free">Gratis</SelectItem>
                  <SelectItem value="negotiable">A Negociar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.price_type !== "free" && formData.price_type !== "negotiable" && (
              <div className="space-y-2">
                <Label htmlFor="price_amount">Precio (€)</Label>
                <Input
                  id="price_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.price_amount}
                  onChange={(e) => setFormData({ ...formData, price_amount: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_preference">Preferencia de Contacto *</Label>
            <Select
              value={formData.contact_preference}
              onValueChange={(value) => setFormData({ ...formData, contact_preference: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las opciones</SelectItem>
                <SelectItem value="email">Solo Email</SelectItem>
                <SelectItem value="phone">Solo Teléfono</SelectItem>
                <SelectItem value="whatsapp">Solo WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Publicar Oferta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
