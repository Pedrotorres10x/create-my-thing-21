import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, CheckCircle2, AlertCircle, Clock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface Chapter {
  chapter_id: string;
  chapter_name: string;
  city: string;
  state: string;
  member_count: number;
}

interface SpecializationAvailabilityIndicatorProps {
  professionSpecializationId: number;
  currentChapterId?: string;
  currentState?: string;
  showAlternatives?: boolean;
}

export const SpecializationAvailabilityIndicator = ({
  professionSpecializationId,
  currentChapterId,
  currentState,
  showAlternatives = true,
}: SpecializationAvailabilityIndicatorProps) => {
  const [availableChapters, setAvailableChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCurrentAvailable, setIsCurrentAvailable] = useState<boolean | null>(null);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [currentProfessionalId, setCurrentProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrentProf = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("professionals").select("id").eq("user_id", user.id).single();
        if (data) setCurrentProfessionalId(data.id);
      }
    };
    loadCurrentProf();
  }, []);

  useEffect(() => {
    const loadAvailability = async () => {
      setLoading(true);
      try {
        if (currentChapterId) {
          const { data: available, error: availError } = await supabase.rpc(
            "check_specialization_availability",
            {
              _chapter_id: currentChapterId,
              _profession_specialization_id: professionSpecializationId,
            }
          );

          if (!availError) {
            setIsCurrentAvailable(available);
          }

          // Check if already in waitlist
          if (currentProfessionalId) {
            const { data: waitEntry } = await supabase
              .from("chapter_specialization_waitlist")
              .select("position_in_queue")
              .eq("professional_id", currentProfessionalId)
              .eq("chapter_id", currentChapterId)
              .eq("profession_specialization_id", professionSpecializationId)
              .eq("status", "waiting")
              .maybeSingle();

            if (waitEntry) {
              setWaitlistPosition(waitEntry.position_in_queue);
            }
          }
        }

        if (showAlternatives) {
          const { data, error } = await supabase.rpc(
            "get_available_chapters_for_specialization",
            {
              _profession_specialization_id: professionSpecializationId,
              _state: currentState || null,
            }
          );

          if (!error && data) {
            setAvailableChapters(data);
          }
        }
      } catch (error) {
        console.error("Error loading availability:", error);
      } finally {
        setLoading(false);
      }
    };

    if (professionSpecializationId) {
      loadAvailability();
    }
  }, [professionSpecializationId, currentChapterId, currentState, showAlternatives, currentProfessionalId]);

  const joinWaitlist = async (chapterId: string) => {
    if (!currentProfessionalId) return;
    setJoiningWaitlist(true);
    try {
      const { error } = await supabase.from("chapter_specialization_waitlist").insert({
        professional_id: currentProfessionalId,
        chapter_id: chapterId,
        profession_specialization_id: professionSpecializationId,
      });

      if (error) throw error;

      toast({
        title: "✅ En lista de espera",
        description: "Te notificaremos automáticamente cuando se libere la plaza. Serás asignado directamente.",
      });

      // Refresh position
      const { data: waitEntry } = await supabase
        .from("chapter_specialization_waitlist")
        .select("position_in_queue")
        .eq("professional_id", currentProfessionalId)
        .eq("chapter_id", chapterId)
        .eq("profession_specialization_id", professionSpecializationId)
        .eq("status", "waiting")
        .maybeSingle();

      if (waitEntry) setWaitlistPosition(waitEntry.position_in_queue);
    } catch (error: any) {
      console.error("Error joining waitlist:", error);
      toast({
        title: "Error",
        description: error.message?.includes("unique") 
          ? "Ya estás en la lista de espera para esta plaza."
          : "No se pudo unir a la lista de espera.",
        variant: "destructive",
      });
    } finally {
      setJoiningWaitlist(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estado actual */}
      {currentChapterId && isCurrentAvailable !== null && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {isCurrentAvailable ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-600">
                      ✅ Disponible en tu capítulo
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Esta especialización está disponible. Puedes continuar con tu registro.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">
                      ❌ Ocupada en tu capítulo
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ya existe un profesional con esta especialización en tu capítulo.
                    </p>
                    {waitlistPosition ? (
                      <div className="mt-3 flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>Estás en la <strong>posición #{waitlistPosition}</strong> de la lista de espera. Te asignaremos automáticamente cuando se libere la plaza.</span>
                      </div>
                    ) : currentProfessionalId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => joinWaitlist(currentChapterId)}
                        disabled={joiningWaitlist}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {joiningWaitlist ? "Uniéndose..." : "Unirme a la lista de espera"}
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capítulos alternativos */}
      {showAlternatives && isCurrentAvailable === false && availableChapters.length > 0 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              Ver capítulos con disponibilidad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Capítulos con disponibilidad</DialogTitle>
              <DialogDescription>
                Esta especialización está disponible en los siguientes capítulos
                {currentState && ` de ${currentState}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {availableChapters.slice(0, 10).map((chapter) => (
                <Card key={chapter.chapter_id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{chapter.chapter_name}</span>
                      <Badge variant="secondary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Disponible
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {chapter.city}, {chapter.state}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {chapter.member_count} miembros
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
