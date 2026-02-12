import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Video, Clock, CheckCircle, XCircle, MessageSquare, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestMeetingDialog } from "@/components/meetings/RequestMeetingDialog";
import { format, isPast } from "date-fns";
import { es } from "date-fns/locale";


interface Meeting {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  meeting_date: string | null;
  duration_minutes: number;
  location: string | null;
  meeting_type: string;
  meeting_link: string | null;
  notes: string | null;
  created_at: string;
  requester: {
    id: string;
    full_name: string;
    photo_url: string | null;
    position: string | null;
    company_name: string | null;
  };
  recipient: {
    id: string;
    full_name: string;
    photo_url: string | null;
    position: string | null;
    company_name: string | null;
  };
}

const Meetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfessionalId, setMyProfessionalId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (!professional) {
        setLoading(false);
        return;
      }

      setMyProfessionalId(professional.id);

      const { data: meetingsData, error } = await supabase
        .from('meetings')
        .select(`
          *,
          requester:requester_id(id, full_name, photo_url, position, company_name),
          recipient:recipient_id(id, full_name, photo_url, position, company_name)
        `)
        .or(`requester_id.eq.${professional.id},recipient_id.eq.${professional.id}`)
        .order('meeting_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error loading meetings:', error);
      } else {
        setMeetings(meetingsData as any || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMeetingStatus = async (meetingId: string, status: string) => {
    const { error } = await supabase
      .from('meetings')
      .update({ status })
      .eq('id', meetingId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Éxito",
      description: `Reunión ${status === 'confirmed' ? 'confirmada' : status === 'cancelled' ? 'cancelada' : 'completada'}`,
    });

    loadData();
  };

  const getOtherParticipant = (meeting: Meeting) => {
    return meeting.requester_id === myProfessionalId 
      ? meeting.recipient 
      : meeting.requester;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, label: "Pendiente" },
      confirmed: { variant: "default" as const, label: "Confirmada" },
      completed: { variant: "outline" as const, label: "Completada" },
      cancelled: { variant: "destructive" as const, label: "Cancelada" },
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const pendingMeetings = meetings.filter(m => m.status === 'pending');
  const upcomingMeetings = meetings.filter(m => 
    m.status === 'confirmed' && m.meeting_date && !isPast(new Date(m.meeting_date))
  );
  const pastMeetings = meetings.filter(m => 
    m.status === 'completed' || (m.meeting_date && isPast(new Date(m.meeting_date)))
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cara a Cara</h1>
          <p className="text-muted-foreground">Reuniones individuales con miembros de tu trinchera</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Solicitar Reunión
        </Button>
      </div>




      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Próximas ({upcomingMeetings.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pendientes ({pendingMeetings.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Historial ({pastMeetings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No hay reuniones confirmadas próximamente
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingMeetings.map((meeting) => {
              const other = getOtherParticipant(meeting);
              const isRequester = meeting.requester_id === myProfessionalId;
              
              return (
                <Card key={meeting.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={other.photo_url || undefined} />
                        <AvatarFallback>
                          {other.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{other.full_name}</h3>
                            {other.position && (
                              <p className="text-sm text-muted-foreground">{other.position}</p>
                            )}
                            {other.company_name && (
                              <p className="text-sm text-muted-foreground">{other.company_name}</p>
                            )}
                          </div>
                          {getStatusBadge(meeting.status)}
                        </div>
                        
                        <div className="grid gap-2 text-sm">
                          {meeting.meeting_date && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(meeting.meeting_date), "PPP 'a las' p", { locale: es })}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {meeting.duration_minutes} minutos
                          </div>
                          {meeting.meeting_type === 'in_person' && meeting.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {meeting.location}
                            </div>
                          )}
                          {meeting.meeting_type === 'virtual' && meeting.meeting_link && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Video className="h-4 w-4" />
                              <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                Unirse a reunión virtual
                              </a>
                            </div>
                          )}
                          {meeting.notes && (
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <MessageSquare className="h-4 w-4 mt-0.5" />
                              <span>{meeting.notes}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateMeetingStatus(meeting.id, 'completed')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marcar como Completada
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMeetingStatus(meeting.id, 'cancelled')}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No hay solicitudes pendientes
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingMeetings.map((meeting) => {
              const other = getOtherParticipant(meeting);
              const isRecipient = meeting.recipient_id === myProfessionalId;
              
              return (
                <Card key={meeting.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={other.photo_url || undefined} />
                        <AvatarFallback>
                          {other.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{other.full_name}</h3>
                            {other.position && (
                              <p className="text-sm text-muted-foreground">{other.position}</p>
                            )}
                            {other.company_name && (
                              <p className="text-sm text-muted-foreground">{other.company_name}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {isRecipient ? 'Te ha solicitado una reunión' : 'Esperando confirmación'}
                            </p>
                          </div>
                          {getStatusBadge(meeting.status)}
                        </div>
                        
                        {meeting.notes && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MessageSquare className="h-4 w-4 mt-0.5" />
                            <span>{meeting.notes}</span>
                          </div>
                        )}

                        {isRecipient && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateMeetingStatus(meeting.id, 'confirmed')}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Aceptar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMeetingStatus(meeting.id, 'cancelled')}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {pastMeetings.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No hay reuniones completadas aún
                </p>
              </CardContent>
            </Card>
          ) : (
            pastMeetings.map((meeting) => {
              const other = getOtherParticipant(meeting);
              
              return (
                <Card key={meeting.id} className="opacity-75">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={other.photo_url || undefined} />
                        <AvatarFallback>
                          {other.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{other.full_name}</h3>
                            {meeting.meeting_date && (
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(meeting.meeting_date), "PPP", { locale: es })}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(meeting.status)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <RequestMeetingDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
};

export default Meetings;
