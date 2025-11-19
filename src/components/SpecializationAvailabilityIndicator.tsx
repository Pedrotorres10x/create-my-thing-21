import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  useEffect(() => {
    const loadAvailability = async () => {
      setLoading(true);
      try {
        // Verificar disponibilidad en el capítulo actual si está definido
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
        }

        // Cargar capítulos alternativos con disponibilidad
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
  }, [professionSpecializationId, currentChapterId, currentState, showAlternatives]);

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
                  <div>
                    <p className="font-medium text-destructive">
                      ❌ Ocupada en tu capítulo
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ya existe un profesional con esta especialización en tu capítulo.
                    </p>
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
