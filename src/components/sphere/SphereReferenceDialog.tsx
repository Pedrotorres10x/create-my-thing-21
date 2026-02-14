import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Award } from "lucide-react";

interface Professional {
  id: string;
  full_name: string;
  profession_specializations: {
    name: string;
  } | null;
}

interface SphereReferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sphereId: number;
  currentProfessionalId: string;
}

export const SphereReferenceDialog = ({
  open,
  onOpenChange,
  sphereId,
  currentProfessionalId
}: SphereReferenceDialogProps) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState("");
  const [clientName, setClientName] = useState("");
  const [serviceNeeded, setServiceNeeded] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && sphereId) {
      loadProfessionals();
    }
  }, [open, sphereId]);

  const loadProfessionals = async () => {
    try {
      const { data } = await supabase
        .from("professionals_public")
        .select(`
          id,
          full_name,
          profession_specializations (
            name
          )
        `)
        .eq("business_sphere_id", sphereId)
        .neq("id", currentProfessionalId)
        .order("full_name");

      setProfessionals(data || []);
    } catch (error) {
      console.error("Error loading professionals:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("sphere_internal_references")
        .insert({
          referrer_id: currentProfessionalId,
          referred_to_id: selectedProfessional,
          business_sphere_id: sphereId,
          client_name: clientName.trim(),
          service_needed: serviceNeeded.trim(),
          notes: notes.trim() || null,
          status: "pending"
        });

      if (error) throw error;

      toast({
        title: "¡Referencia enviada!",
        description: "Has ganado 50 puntos extra por referir dentro de tu esfera",
        action: (
          <div className="flex items-center gap-2 text-primary">
            <Award className="h-4 w-4" />
            <span className="font-bold">+50 pts</span>
          </div>
        )
      });

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la referencia",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProfessional("");
    setClientName("");
    setServiceNeeded("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🤝 Referir a mi Grupo Profesional
            <span className="text-sm font-normal text-muted-foreground">
              (+50 puntos)
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="professional">Profesional de tu esfera *</Label>
            <Select
              value={selectedProfessional}
              onValueChange={setSelectedProfessional}
              required
            >
              <SelectTrigger id="professional">
                <SelectValue placeholder="Selecciona un profesional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.full_name}
                    {prof.profession_specializations && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({prof.profession_specializations.name})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Nombre del cliente *</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceNeeded">Servicio necesitado *</Label>
            <Input
              id="serviceNeeded"
              value={serviceNeeded}
              onChange={(e) => setServiceNeeded(e.target.value)}
              placeholder="Ej: Valoración de propiedad"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles relevantes sobre el cliente o el servicio..."
              className="min-h-[80px]"
            />
          </div>

          <div className="bg-accent/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 Las referencias dentro de tu esfera otorgan{" "}
              <span className="font-semibold text-foreground">50 puntos</span>{" "}
              (vs 30 puntos por referencias normales)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Referencia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
