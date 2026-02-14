import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { RecommendClient } from "@/components/sphere/RecommendClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Recomendacion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [sphereId, setSphereId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("professionals")
        .select("id, chapter_id, business_sphere_id")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setProfessionalId(data.id);
        setChapterId(data.chapter_id);
        setSphereId(data.business_sphere_id);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!professionalId || !sphereId) {
    return (
      <div className="py-8">
        <Card className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Completa tu perfil</h2>
          <p className="text-muted-foreground">Necesitas tener tu perfil profesional y tribu asignada para recomendar clientes.</p>
          <Button onClick={() => navigate("/dashboard")}>Ir a Alic.IA</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Send className="h-7 w-7" />
          Recomendación
        </h1>
        <p className="text-muted-foreground">
          Envía un cliente a un miembro de tu tribu. Cuando cierre el trato, cobras tu comisión.
        </p>
      </div>

      <RecommendClient
        professionalId={professionalId}
        chapterId={chapterId}
        sphereId={sphereId}
      />
    </div>
  );
}
