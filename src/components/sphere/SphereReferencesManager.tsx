import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, User, Briefcase, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Reference {
  id: string;
  client_name: string;
  service_needed: string;
  notes: string | null;
  status: string;
  points_awarded: number | null;
  created_at: string;
  completed_at: string | null;
  referrer: {
    full_name: string;
    profession_specializations: { name: string } | null;
  };
  referred_to: {
    full_name: string;
    profession_specializations: { name: string } | null;
  };
}

interface SphereReferencesManagerProps {
  currentProfessionalId: string;
}

export const SphereReferencesManager = ({
  currentProfessionalId
}: SphereReferencesManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [sentReferences, setSentReferences] = useState<Reference[]>([]);
  const [receivedReferences, setReceivedReferences] = useState<Reference[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadReferences();
  }, [currentProfessionalId]);

  const loadReferences = async () => {
    try {
      setLoading(true);

      // Sent references
      const { data: sent } = await supabase
        .from("sphere_internal_references")
        .select(`
          *,
          referrer:professionals!sphere_internal_references_referrer_id_fkey(
            full_name,
            profession_specializations(name)
          ),
          referred_to:professionals!sphere_internal_references_referred_to_id_fkey(
            full_name,
            profession_specializations(name)
          )
        `)
        .eq("referrer_id", currentProfessionalId)
        .order("created_at", { ascending: false });

      // Received references
      const { data: received } = await supabase
        .from("sphere_internal_references")
        .select(`
          *,
          referrer:professionals!sphere_internal_references_referrer_id_fkey(
            full_name,
            profession_specializations(name)
          ),
          referred_to:professionals!sphere_internal_references_referred_to_id_fkey(
            full_name,
            profession_specializations(name)
          )
        `)
        .eq("referred_to_id", currentProfessionalId)
        .order("created_at", { ascending: false });

      setSentReferences((sent || []) as Reference[]);
      setReceivedReferences((received || []) as Reference[]);
    } catch (error) {
      console.error("Error loading references:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReference = async (referenceId: string) => {
    try {
      const { error } = await supabase
        .from("sphere_internal_references")
        .update({ status: "completed" })
        .eq("id", referenceId);

      if (error) throw error;

      toast({
        title: "¡Referencia completada!",
        description: "El referente ha recibido 50 puntos automáticamente",
        action: (
          <div className="flex items-center gap-2 text-primary">
            <Award className="h-4 w-4" />
            <span className="font-bold">+50 pts otorgados</span>
          </div>
        )
      });

      await loadReferences();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const ReferenceCard = ({ reference, isReceived }: { reference: Reference; isReceived: boolean }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{reference.client_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-3 w-3" />
                <span>{reference.service_needed}</span>
              </div>
            </div>
            <Badge variant={reference.status === "completed" ? "default" : "secondary"}>
              {reference.status === "completed" ? (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Completada
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Pendiente
                </div>
              )}
            </Badge>
          </div>

          <div className="text-sm">
            <span className="text-muted-foreground">
              {isReceived ? "Referido por: " : "Referido a: "}
            </span>
            <span className="font-medium">
              {isReceived ? reference.referrer.full_name : reference.referred_to.full_name}
            </span>
            {(isReceived ? reference.referrer.profession_specializations : reference.referred_to.profession_specializations) && (
              <span className="text-xs text-muted-foreground ml-2">
                ({isReceived 
                  ? reference.referrer.profession_specializations?.name 
                  : reference.referred_to.profession_specializations?.name})
              </span>
            )}
          </div>

          {reference.notes && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              {reference.notes}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {format(new Date(reference.created_at), "d 'de' MMMM, yyyy", { locale: es })}
            </span>
            
            {isReceived && reference.status === "pending" && (
              <Button
                size="sm"
                onClick={() => handleCompleteReference(reference.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como Completada
              </Button>
            )}

            {reference.status === "completed" && reference.points_awarded && (
              <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                <Award className="h-4 w-4" />
                +{reference.points_awarded} pts
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="received" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="received">
          Recibidas ({receivedReferences.length})
        </TabsTrigger>
        <TabsTrigger value="sent">
          Enviadas ({sentReferences.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="received" className="space-y-4 mt-6">
        {receivedReferences.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No has recibido referencias de tu esfera aún
            </CardContent>
          </Card>
        ) : (
          receivedReferences.map((ref) => (
            <ReferenceCard key={ref.id} reference={ref} isReceived={true} />
          ))
        )}
      </TabsContent>

      <TabsContent value="sent" className="space-y-4 mt-6">
        {sentReferences.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No has enviado referencias a tu esfera aún
            </CardContent>
          </Card>
        ) : (
          sentReferences.map((ref) => (
            <ReferenceCard key={ref.id} reference={ref} isReceived={false} />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};
