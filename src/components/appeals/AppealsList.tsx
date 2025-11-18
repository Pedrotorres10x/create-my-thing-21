import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppealStatusBadge } from "./AppealStatusBadge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface Appeal {
  id: string;
  penalty_id: string;
  appeal_reason: string;
  additional_context: string | null;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  admin_response: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_penalties: {
    reason: string;
    severity: string;
  };
}

interface AppealsListProps {
  professionalId: string;
}

export function AppealsList({ professionalId }: AppealsListProps) {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppeals();
  }, [professionalId]);

  const fetchAppeals = async () => {
    try {
      const { data, error } = await supabase
        .from('penalty_appeals')
        .select(`
          *,
          user_penalties (
            reason,
            severity
          )
        `)
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppeals((data || []) as Appeal[]);
    } catch (error) {
      console.error('Error fetching appeals:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (appeals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tienes apelaciones registradas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appeals.map((appeal) => (
        <Card key={appeal.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">Apelación de sanción</CardTitle>
                <CardDescription>
                  Creada el {format(new Date(appeal.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </CardDescription>
              </div>
              <AppealStatusBadge status={appeal.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Sanción original:
              </p>
              <p className="text-sm">{appeal.user_penalties.reason}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Motivo de la apelación:
              </p>
              <p className="text-sm">{appeal.appeal_reason}</p>
            </div>

            {appeal.additional_context && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Contexto adicional:
                </p>
                <p className="text-sm text-muted-foreground">{appeal.additional_context}</p>
              </div>
            )}

            {appeal.admin_response && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Respuesta del equipo:
                </p>
                <p className="text-sm">{appeal.admin_response}</p>
                {appeal.reviewed_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Revisado el {format(new Date(appeal.reviewed_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
