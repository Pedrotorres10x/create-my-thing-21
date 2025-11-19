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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface Specialization {
  id: number;
  name: string;
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sphereId: number;
  chapterId: string | null;
  onSuccess: () => void;
}

export const CreateProjectDialog = ({
  open,
  onOpenChange,
  sphereId,
  chapterId,
  onSuccess
}: CreateProjectDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpecs, setSelectedSpecs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentProfessionalId, setCurrentProfessionalId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCurrentProfessional();
      loadSpecializations();
    }
  }, [open, sphereId]);

  const loadCurrentProfessional = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setCurrentProfessionalId(data.id);
    }
  };

  const loadSpecializations = async () => {
    try {
      const { data: sphereSpecs } = await supabase
        .from("sphere_specializations")
        .select(`
          specialization_id,
          specializations!inner (
            id,
            name
          )
        `)
        .eq("business_sphere_id", sphereId);

      if (!sphereSpecs) return;

      const specializationIds = sphereSpecs.map(s => s.specialization_id);

      const { data: profSpecs } = await supabase
        .from("profession_specializations")
        .select("id, name")
        .in("specialization_id", specializationIds);

      setSpecializations(profSpecs || []);
    } catch (error) {
      console.error("Error loading specializations:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfessionalId || !chapterId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("sphere_collaborative_projects")
        .insert({
          business_sphere_id: sphereId,
          chapter_id: chapterId,
          creator_id: currentProfessionalId,
          title: title.trim(),
          description: description.trim(),
          required_specializations: selectedSpecs,
          status: "active"
        });

      if (error) throw error;

      toast({
        title: "Proyecto creado",
        description: "Tu proyecto colaborativo está ahora visible para tu esfera"
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el proyecto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedSpecs([]);
  };

  const toggleSpecialization = (specId: number) => {
    setSelectedSpecs(prev =>
      prev.includes(specId)
        ? prev.filter(id => id !== specId)
        : [...prev, specId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Proyecto Colaborativo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título del Proyecto *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Promoción Residencial Los Pinos"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el proyecto y qué tipo de colaboración necesitas..."
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Especialidades Necesarias *</Label>
            <p className="text-sm text-muted-foreground">
              Selecciona las especialidades que necesitas para este proyecto
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto border rounded-lg p-4">
              {specializations.map((spec) => (
                <div key={spec.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`spec-${spec.id}`}
                    checked={selectedSpecs.includes(spec.id)}
                    onCheckedChange={() => toggleSpecialization(spec.id)}
                  />
                  <label
                    htmlFor={`spec-${spec.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {spec.name}
                  </label>
                </div>
              ))}
            </div>
            {selectedSpecs.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedSpecs.length} especialidad{selectedSpecs.length !== 1 ? "es" : ""} seleccionada{selectedSpecs.length !== 1 ? "s" : ""}
              </p>
            )}
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
            <Button
              type="submit"
              disabled={loading || !title.trim() || !description.trim() || selectedSpecs.length === 0}
            >
              {loading ? "Creando..." : "Crear Proyecto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
