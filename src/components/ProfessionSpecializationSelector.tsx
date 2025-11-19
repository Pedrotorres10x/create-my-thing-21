import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ProfessionSpecialization {
  id: number;
  name: string;
  description: string;
}

interface ProfessionSpecializationSelectorProps {
  specializationId: number | null;
  chapterId: string | null;
  value: number | null;
  onChange: (id: number | null) => void;
  required?: boolean;
}

export const ProfessionSpecializationSelector = ({
  specializationId,
  chapterId,
  value,
  onChange,
  required = false,
}: ProfessionSpecializationSelectorProps) => {
  const [specializations, setSpecializations] = useState<ProfessionSpecialization[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Cargar especializaciones específicas cuando cambia la profesión
  useEffect(() => {
    if (!specializationId) {
      setSpecializations([]);
      return;
    }

    const loadSpecializations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profession_specializations")
          .select("*")
          .eq("specialization_id", specializationId)
          .order("name");

        if (error) throw error;
        setSpecializations(data || []);
      } catch (error) {
        console.error("Error loading profession specializations:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las especializaciones",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSpecializations();
  }, [specializationId, toast]);

  // Verificar disponibilidad cuando cambia la especialización o el capítulo
  useEffect(() => {
    if (!value || !chapterId) {
      setIsAvailable(null);
      return;
    }

    const checkAvailability = async () => {
      setCheckingAvailability(true);
      try {
        const { data, error } = await supabase.rpc("check_specialization_availability", {
          _chapter_id: chapterId,
          _profession_specialization_id: value,
        });

        if (error) throw error;
        setIsAvailable(data);

        if (!data) {
          toast({
            title: "Especialización ocupada",
            description: "Esta especialización ya está ocupada en tu capítulo. Por favor, selecciona otra.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error checking availability:", error);
      } finally {
        setCheckingAvailability(false);
      }
    };

    checkAvailability();
  }, [value, chapterId, toast]);

  if (!specializationId) {
    return (
      <div className="space-y-2">
        <Label>Especialización Específica</Label>
        <p className="text-sm text-muted-foreground">
          Primero selecciona tu profesión para ver las especializaciones disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="profession_specialization">
        Especialización Específica {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Select
          value={value?.toString() || ""}
          onValueChange={(val) => onChange(val ? parseInt(val) : null)}
          disabled={loading || specializations.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona tu especialización específica" />
          </SelectTrigger>
          <SelectContent>
            {specializations.map((spec) => (
              <SelectItem key={spec.id} value={spec.id.toString()}>
                <div className="flex flex-col">
                  <span className="font-medium">{spec.name}</span>
                  {spec.description && (
                    <span className="text-xs text-muted-foreground">{spec.description}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Indicador de disponibilidad */}
      {value && chapterId && (
        <div className="flex items-center gap-2 text-sm">
          {checkingAvailability ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Verificando disponibilidad...</span>
            </>
          ) : isAvailable === true ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-green-600">✅ Disponible en tu capítulo</span>
            </>
          ) : isAvailable === false ? (
            <>
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">❌ Ocupada en tu capítulo</span>
            </>
          ) : null}
        </div>
      )}

      {specializations.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          No hay especializaciones disponibles para esta profesión
        </p>
      )}
    </div>
  );
};
