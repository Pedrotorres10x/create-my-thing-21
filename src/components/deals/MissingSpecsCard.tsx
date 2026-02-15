import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback examples per sphere when DB has insufficient data
const SPHERE_EXAMPLES: Record<string, string[]> = {
  "Esfera Inmobiliaria": ["Tasador", "Arquitecto", "Abogado hipotecario", "Home staging", "Reformista", "Notaría", "Administrador de fincas", "Interiorista"],
  "Esfera Digital": ["Diseñador web", "SEO", "Community manager", "Desarrollo de apps", "Fotografía profesional", "Copywriter", "Publicidad online", "Analista de datos"],
  "Esfera Salud y Bienestar": ["Fisioterapeuta", "Nutricionista", "Psicólogo", "Dentista", "Osteópata", "Entrenador personal", "Podólogo", "Farmacéutico"],
  "Esfera Servicios Empresariales": ["Gestoría", "Abogado mercantil", "Consultor fiscal", "RRHH", "Seguros", "Auditoría", "Coach empresarial", "Traductor jurado"],
  "Esfera Producción e Industria": ["Logística", "Control de calidad", "Mantenimiento industrial", "Automatización", "Ingeniería", "Prevención de riesgos", "Compras", "Embalaje"],
  "Esfera Alimentación y Hostelería": ["Chef", "Sumiller", "Proveedor de producto", "Diseño de cartas", "Marketing gastronómico", "Gestión de sala", "Dietista", "Delivery"],
  "Esfera Retail y Comercio": ["Visual merchandising", "E-commerce", "Escaparatismo", "Franquicias", "Logística retail", "Atención al cliente", "Trade marketing", "Gestión de stock"],
  "Esfera Formación y Desarrollo": ["Coach ejecutivo", "Formador de ventas", "E-learning", "Oratoria", "Team building", "Mentoring", "PNL", "Gamificación"],
};

interface MissingSpec {
  id: number;
  name: string;
}

interface MissingSpecsProps {
  professionalId: string;
}

export const MissingSpecsCard = ({ professionalId }: MissingSpecsProps) => {
  const [missing, setMissing] = useState<MissingSpec[]>([]);
  const [covered, setCovered] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sphereName, setSphereName] = useState("");

  useEffect(() => {
    fetchMissingSpecs();
  }, [professionalId]);

  const fetchMissingSpecs = async () => {
    try {
      // Get user's sphere and chapter
      const { data: prof } = await (supabase as any)
        .from("professionals")
        .select("business_sphere_id, chapter_id, business_spheres(name)")
        .eq("id", professionalId)
        .single();

      if (!prof?.business_sphere_id || !prof?.chapter_id) {
        setLoading(false);
        return;
      }

      setSphereName(prof.business_spheres?.name || "");

      // Get all specializations in user's sphere
      const { data: sphereSpecs } = await (supabase as any)
        .from("sphere_specializations")
        .select("specialization_id, specializations(id, name)")
        .eq("business_sphere_id", prof.business_sphere_id);

      // Get specializations already covered in the chapter
      const { data: chapterMembers } = await (supabase as any)
        .from("professionals")
        .select("specialization_id, specializations(name)")
        .eq("chapter_id", prof.chapter_id)
        .eq("status", "approved")
        .not("specialization_id", "is", null);

      const coveredIds = new Set(
        (chapterMembers || []).map((m: any) => m.specialization_id)
      );
      const coveredNames: string[] = (chapterMembers || [])
        .filter((m: any) => m.specializations?.name)
        .map((m: any) => m.specializations.name as string);
      setCovered([...new Set(coveredNames)]);

      let missingSpecs = (sphereSpecs || [])
        .filter((ss: any) => !coveredIds.has(ss.specialization_id))
        .map((ss: any) => ({
          id: ss.specializations?.id,
          name: ss.specializations?.name,
        }))
        .filter((s: MissingSpec) => s.name);

      // If DB doesn't have enough data, use fallback examples
      const sName = prof.business_spheres?.name || "";
      const fallbackExamples = SPHERE_EXAMPLES[sName] || [];
      const coveredSet = new Set(coveredNames.map(n => n.toLowerCase()));
      
      if (missingSpecs.length < 5 && fallbackExamples.length > 0) {
        const existingNames = new Set(missingSpecs.map(s => s.name.toLowerCase()));
        const extraExamples = fallbackExamples
          .filter(ex => !coveredSet.has(ex.toLowerCase()) && !existingNames.has(ex.toLowerCase()))
          .slice(0, 5 - missingSpecs.length)
          .map((name, i) => ({ id: -(i + 1), name }));
        missingSpecs = [...missingSpecs, ...extraExamples];
      }

      setMissing(missingSpecs);
    } catch (error) {
      console.error("Error fetching missing specs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Skeleton className="h-32 w-full" />;
  if (!sphereName) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Huecos en tu Trinchera
        </CardTitle>
        <CardDescription>
          Profesiones de <span className="font-medium">{sphereName}</span> que aún no tiene tu grupo. Ficha a alguien que las cubra y todos ganaréis más.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {missing.length === 0 && covered.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="h-4 w-4" />
              ¡Tu tribu cubre todas las profesiones de tu esfera!
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Ejemplos cubiertos</p>
              <div className="flex flex-wrap gap-2">
                {covered.slice(0, 5).map((name) => (
                  <Badge key={name} variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : missing.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay datos de esfera configurados.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {missing.length} {missing.length === 1 ? "profesión sin cubrir" : "profesiones sin cubrir"} — cada hueco es dinero que se pierde
              </p>
              <div className="flex flex-wrap gap-2">
                {missing.slice(0, 5).map((spec) => (
                  <Badge key={spec.id} variant="outline" className="border-destructive text-destructive">
                    {spec.name}
                  </Badge>
                ))}
              </div>
              {missing.length > 5 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Y {missing.length - 5} más sin cubrir...
                </p>
              )}
            </div>
            {covered.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Cubiertas</p>
                <div className="flex flex-wrap gap-2">
                  {covered.slice(0, Math.max(0, 5 - Math.min(missing.length, 5))).map((name) => (
                    <Badge key={name} variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
