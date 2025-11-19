import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import * as LucideIcons from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BusinessSphere {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

interface BusinessSphereSelectorProps {
  value?: number;
  onChange: (value: number) => void;
  specializationId?: number;
  required?: boolean;
}

export const BusinessSphereSelector = ({
  value,
  onChange,
  specializationId,
  required = true
}: BusinessSphereSelectorProps) => {
  const [spheres, setSpheres] = useState<BusinessSphere[]>([]);
  const [suggestedSphereId, setSuggestedSphereId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSpheres();
  }, []);

  useEffect(() => {
    if (specializationId) {
      loadSuggestedSphere(specializationId);
    }
  }, [specializationId]);

  const loadSpheres = async () => {
    try {
      const { data, error } = await supabase
        .from("business_spheres")
        .select("*")
        .order("name");

      if (error) throw error;
      setSpheres(data || []);
    } catch (error) {
      console.error("Error loading spheres:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las esferas de negocio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestedSphere = async (specId: number) => {
    try {
      const { data, error } = await supabase
        .from("sphere_specializations")
        .select("business_sphere_id")
        .eq("specialization_id", specId)
        .eq("is_core", true)
        .single();

      if (error) throw error;

      if (data && !value) {
        setSuggestedSphereId(data.business_sphere_id);
        onChange(data.business_sphere_id);
        
        const sphere = spheres.find(s => s.id === data.business_sphere_id);
        if (sphere) {
          toast({
            title: "Esfera sugerida",
            description: `Te recomendamos "${sphere.name}" según tu especialización`,
          });
        }
      }
    } catch (error) {
      console.error("Error loading suggested sphere:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Esfera de Negocio {required && "*"}</Label>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="business_sphere">
        Esfera de Negocio {required && "*"}
      </Label>
      <Select
        value={value?.toString()}
        onValueChange={(val) => onChange(parseInt(val))}
        required={required}
      >
        <SelectTrigger id="business_sphere">
          <SelectValue placeholder="Selecciona tu esfera de negocio" />
        </SelectTrigger>
        <SelectContent>
          {spheres.map((sphere) => {
            const IconComponent = sphere.icon 
              ? (LucideIcons as any)[sphere.icon] || LucideIcons.Circle
              : LucideIcons.Circle;
            
            const isSuggested = sphere.id === suggestedSphereId;
            
            return (
              <SelectItem 
                key={sphere.id} 
                value={sphere.id.toString()}
                className={isSuggested ? "bg-accent/50" : ""}
              >
                <div className="flex items-center gap-2">
                  <IconComponent 
                    className="h-4 w-4" 
                    style={{ color: sphere.color || undefined }}
                  />
                  <span>{sphere.name}</span>
                  {isSuggested && (
                    <span className="text-xs text-muted-foreground">(Sugerida)</span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {value && (
        <p className="text-sm text-muted-foreground">
          {spheres.find(s => s.id === value)?.description}
        </p>
      )}
    </div>
  );
};
