import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Mail, Gift, CheckCircle, Clock, Users, UserPlus, Handshake } from "lucide-react";
import { DealsList } from "@/components/deals/DealsList";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface Professional {
  id: string;
  referral_code: string;
  full_name: string;
}

interface Referral {
  id: string;
  referred_email: string;
  status: string;
  reward_points: number;
  created_at: string;
  completed_at: string | null;
}

const Referrals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralEmail, setReferralEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    totalPoints: 0
  });

  useEffect(() => {
    if (user) {
      fetchProfessionalData();
      fetchReferrals();
    }
  }, [user]);

  const fetchProfessionalData = async () => {
    const { data, error } = await (supabase as any)
      .from('professionals')
      .select('id, referral_code, full_name')
      .eq('user_id', user?.id)
      .single();

    if (error) {
      console.error('Error fetching professional:', error);
      return;
    }

    setProfessional(data);
  };

  const fetchReferrals = async () => {
    const { data: profData } = await (supabase as any)
      .from('professionals')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    if (!profData) return;

    const { data, error } = await (supabase as any)
      .from('referrals')
      .select('*')
      .eq('referrer_id', profData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrals:', error);
      return;
    }

    setReferrals(data || []);

    const total = data?.length || 0;
    const pending = data?.filter((r: Referral) => r.status === 'pending').length || 0;
    const completed = data?.filter((r: Referral) => r.status === 'completed').length || 0;
    const totalPoints = data?.reduce((sum: number, r: Referral) => sum + (r.reward_points || 0), 0) || 0;

    setStats({ total, pending, completed, totalPoints });
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/auth?ref=${professional?.referral_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "¡Enlace copiado!",
      description: "El enlace de referido se ha copiado al portapapeles",
    });
  };

  const copyReferralCode = () => {
    if (professional?.referral_code) {
      navigator.clipboard.writeText(professional.referral_code);
      toast({
        title: "¡Código copiado!",
        description: "El código de referido se ha copiado al portapapeles",
      });
    }
  };

  const shareViaWhatsApp = () => {
    const message = `¡Únete a CONECTOR con mi código de referido ${professional?.referral_code}! ${window.location.origin}/auth?ref=${professional?.referral_code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = "Únete a CONECTOR";
    const body = `¡Hola! Te invito a unirte a CONECTOR, una red profesional de crecimiento.\n\nUsa mi código de referido: ${professional?.referral_code}\n\nO regístrate directamente aquí: ${window.location.origin}/auth?ref=${professional?.referral_code}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const sendReferralInvite = async () => {
    if (!referralEmail || !professional) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('referrals')
        .insert({
          referrer_id: professional.id,
          referred_email: referralEmail,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "¡Invitación enviada!",
        description: `Se ha registrado la invitación para ${referralEmail}`,
      });

      setReferralEmail("");
      fetchReferrals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la invitación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" /> Completado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!professional) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Completa tu perfil</CardTitle>
            <CardDescription>
              Necesitas completar tu perfil profesional para acceder a Mis Fichajes
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
         <h1 className="text-3xl font-bold mb-2">Mis Fichajes</h1>
         <p className="text-muted-foreground">Ficha profesionales para tu tribu e intercambia clientes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Invitaciones Enviadas</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-3xl">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completados</CardDescription>
            <CardTitle className="text-3xl">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Puntos Ganados</CardDescription>
            <CardTitle className="text-3xl flex items-center">
              <Gift className="w-6 h-6 mr-2 text-primary" />
              {stats.totalPoints}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Two-tab layout: Invite vs Refer */}
      <Tabs defaultValue="invite" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invite" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invitar Profesional
          </TabsTrigger>
          <TabsTrigger value="refer" className="gap-2">
            <Handshake className="h-4 w-4" />
            Referir Cliente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invita a un profesional a tu Tribu
              </CardTitle>
              <CardDescription>
                Cuantas más profesiones cubra tu grupo, más clientes puedes referir y más comisiones recibes. Cada hueco sin cubrir es dinero que se pierde.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={professional.referral_code}
                  readOnly
                  className="text-2xl font-bold text-center"
                />
                <Button onClick={copyReferralCode} size="icon">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={copyReferralLink} className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Copiar Enlace
                </Button>
                <Button onClick={shareViaWhatsApp} variant="outline" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button onClick={shareViaEmail} variant="outline" className="flex-1">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium">Enviar invitación directa</label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={referralEmail}
                    onChange={(e) => setReferralEmail(e.target.value)}
                  />
                  <Button onClick={sendReferralInvite} disabled={loading || !referralEmail}>
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invitations list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Historial de Invitaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aún no has invitado a ningún profesional. ¡Empieza a hacer crecer tu tribu!
                </p>
              ) : (
                <div className="space-y-4">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{referral.referred_email}</p>
                        <p className="text-sm text-muted-foreground">
                          Invitado el {new Date(referral.created_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        {getStatusBadge(referral.status)}
                        {referral.reward_points > 0 && (
                          <p className="text-sm text-primary font-medium">
                            +{referral.reward_points} puntos
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                Mis Tratos
              </CardTitle>
              <CardDescription>
                Gestiona las referencias de clientes enviadas y recibidas. Cuando un trato se cierra, el receptor declara su beneficio y se calcula el 10% de comisión.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {professional ? (
                <DealsList professionalId={professional.id} />
              ) : (
                <p className="text-center text-muted-foreground py-8">Cargando...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Referrals;
