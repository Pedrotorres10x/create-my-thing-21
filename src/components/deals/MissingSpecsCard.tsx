import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

      const missingSpecs = (sphereSpecs || [])
        .filter((ss: any) => !coveredIds.has(ss.specialization_id))
        .map((ss: any) => ({
          id: ss.specializations?.id,
          name: ss.specializations?.name,
        }))
        .filter((s: MissingSpec) => s.name);

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
          <div className="flex items-center gap-2 text-sm text-primary">
            <CheckCircle className="h-4 w-4" />
            ¡Tu tribu cubre todas las profesiones de tu esfera!
          </div>
        ) : missing.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay datos de esfera configurados.</p>
        ) : (
          <div className="space-y-3">
            {missing.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {missing.length} {missing.length === 1 ? "profesión sin cubrir" : "profesiones sin cubrir"} — cada hueco es dinero que se pierde
                </p>
                <div className="flex flex-wrap gap-2">
                  {missing.map((spec) => (
                    <Badge key={spec.id} variant="outline" className="border-destructive text-destructive">
                      {spec.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {covered.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Cubiertas</p>
                <div className="flex flex-wrap gap-2">
                  {covered.map((name) => (
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
