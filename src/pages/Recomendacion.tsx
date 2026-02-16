import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { RecommendClient } from "@/components/sphere/RecommendClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
          Envía un cliente a un miembro de tu tribu. Cuando cierre el trato, recibirás un Agradecimiento.
        </p>
      </div>

      {/* Ejemplos reales de cómo funciona */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-start">
            <div className="bg-primary/10 rounded-full p-3 shrink-0">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-base">Así funciona en la vida real:</h3>
              <div className="space-y-3">
                <div className="bg-card rounded-lg p-4 border space-y-1">
                  <p className="text-sm font-medium text-foreground">🔧 El fontanero que factura sin hacer nada</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Un arquitecto de tu tribu reforma una cocina. El cliente necesita fontanero. Te recomienda. 
                    <span className="font-semibold text-foreground"> Tú cobras sin haber buscado al cliente.</span> El arquitecto gana puntos y comisión.
                  </p>
                </div>
                <div className="bg-card rounded-lg p-4 border space-y-1">
                  <p className="text-sm font-medium text-foreground">💼 La asesora fiscal que multiplica su agenda</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Un abogado cierra una herencia. Los herederos necesitan asesoría fiscal para declarar. Te envía 3 clientes de golpe. 
                    <span className="font-semibold text-foreground"> Un solo trato = 3 clientes nuevos para ti.</span>
                  </p>
                </div>
                <div className="bg-card rounded-lg p-4 border space-y-1">
                  <p className="text-sm font-medium text-foreground">🏠 El agente inmobiliario que cierra en cadena</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Vendes un piso. El comprador necesita hipoteca → recomiendas al bróker. Necesita mudanza → recomiendas a la empresa de tu tribu. Necesita pintar → recomiendas al pintor. 
                    <span className="font-semibold text-foreground"> Una venta tuya genera 3 comisiones extras.</span>
                  </p>
                </div>
                <div className="bg-card rounded-lg p-4 border space-y-1">
                  <p className="text-sm font-medium text-foreground">📸 El fotógrafo que cobra mientras duerme</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Haces las fotos de una boda. La novia pregunta por wedding planner para su hermana. Recomiendas al de tu tribu. 
                    <span className="font-semibold text-foreground"> Tu trabajo de ayer te paga mañana.</span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                Cuando recomiendas un cliente y se cierra el trato, el profesional que lo recibe te envía un <span className="font-semibold text-foreground">Agradecimiento</span> — un gesto de gratitud que fortalece la relación y la confianza del grupo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <RecommendClient
        professionalId={professionalId}
        chapterId={chapterId}
        sphereId={sphereId}
      />
    </div>
  );
}
