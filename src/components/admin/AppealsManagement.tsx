import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppealStatusBadge } from "@/components/appeals/AppealStatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAppealManagement } from "@/hooks/useAppealManagement";
import { Skeleton } from "@/components/ui/skeleton";

interface Appeal {
  id: string;
  penalty_id: string;
  professional_id: string;
  appeal_reason: string;
  additional_context: string | null;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  admin_response: string | null;
  reviewed_at: string | null;
  created_at: string;
  professionals: {
    id: string;
    full_name: string;
    email: string;
    photo_url: string | null;
  };
  user_penalties: {
    penalty_type: string;
    severity: string;
    reason: string;
    points_deducted: number;
  };
}

export function AppealsManagement() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [decision, setDecision] = useState<'approved' | 'rejected'>('rejected');
  const { loading: updating, updateAppeal } = useAppealManagement();
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  useEffect(() => {
    fetchAppeals();
    fetchCurrentAdmin();
  }, []);

  const fetchCurrentAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .single();
      setCurrentAdminId(data?.id || null);
    }
  };

  const fetchAppeals = async () => {
    try {
      const { data, error } = await supabase
        .from('penalty_appeals')
        .select(`
          *,
          professionals!penalty_appeals_professional_id_fkey (
            id,
            full_name,
            email,
            photo_url
          ),
          user_penalties (
            penalty_type,
            severity,
            reason,
            points_deducted
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppeals((data || []) as Appeal[]);
    } catch (error) {
      console.error('Error fetching appeals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = (appeal: Appeal) => {
    setSelectedAppeal(appeal);
    setAdminResponse("");
    setDecision('rejected');
    setDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedAppeal || !currentAdminId || !adminResponse.trim()) return;

    const success = await updateAppeal({
      appealId: selectedAppeal.id,
      status: decision,
      adminResponse: adminResponse.trim(),
      reviewedBy: currentAdminId,
    });

    if (success) {
      setDialogOpen(false);
      fetchAppeals();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (appeals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No hay apelaciones pendientes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {appeals.map((appeal) => (
          <Card key={appeal.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {appeal.professionals.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {appeal.professionals.full_name}
                    </CardTitle>
                    <CardDescription>{appeal.professionals.email}</CardDescription>
                  </div>
                </div>
                <AppealStatusBadge status={appeal.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Sanción original:</p>
                  <Badge variant="destructive">
                    {appeal.user_penalties.severity === 'high' ? 'Alta' : 
                     appeal.user_penalties.severity === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                </div>
                <p className="text-sm">{appeal.user_penalties.reason}</p>
                <p className="text-xs text-muted-foreground">
                  Puntos deducidos: {appeal.user_penalties.points_deducted}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Motivo de la apelación:</p>
                <p className="text-sm text-muted-foreground">{appeal.appeal_reason}</p>
              </div>

              {appeal.additional_context && (
                <div>
                  <p className="text-sm font-medium mb-2">Contexto adicional:</p>
                  <p className="text-sm text-muted-foreground">{appeal.additional_context}</p>
                </div>
              )}

              {appeal.admin_response && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Respuesta del administrador:</p>
                  <p className="text-sm">{appeal.admin_response}</p>
                  {appeal.reviewed_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Revisado el {format(new Date(appeal.reviewed_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Enviada el {format(new Date(appeal.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                {appeal.status === 'pending' || appeal.status === 'under_review' ? (
                  <Button onClick={() => handleReviewClick(appeal)} size="sm">
                    Revisar apelación
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Apelación</DialogTitle>
            <DialogDescription>
              Decide si aprobar o rechazar esta apelación y proporciona una respuesta detallada.
            </DialogDescription>
          </DialogHeader>

          {selectedAppeal && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Apelación de:</p>
                <p className="text-sm">{selectedAppeal.professionals.full_name}</p>
                <p className="text-xs text-muted-foreground">{selectedAppeal.professionals.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Decisión</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={decision === 'approved' ? 'default' : 'outline'}
                    onClick={() => setDecision('approved')}
                    className="flex-1"
                  >
                    ✓ Aprobar
                  </Button>
                  <Button
                    type="button"
                    variant={decision === 'rejected' ? 'destructive' : 'outline'}
                    onClick={() => setDecision('rejected')}
                    className="flex-1"
                  >
                    ✗ Rechazar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-response">
                  Respuesta al profesional <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="admin-response"
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Explica la razón de tu decisión..."
                  rows={5}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">
                  {adminResponse.length}/1000 caracteres
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={updating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={updating || !adminResponse.trim()}
            >
              {updating ? "Guardando..." : "Confirmar decisión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
