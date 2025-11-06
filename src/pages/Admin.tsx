import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Users, Gift, TrendingUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Professional {
  id: string;
  full_name: string;
  email: string;
  business_name: string;
  status: string;
  created_at: string;
}

interface Referral {
  id: string;
  referrer_id: string;
  referred_email: string;
  status: string;
  reward_points: number;
  created_at: string;
}

const Admin = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProfessionals: 0,
    pendingApproval: 0,
    approved: 0,
    totalReferrals: 0,
  });

  useEffect(() => {
    if (!adminLoading) {
      if (!isAdmin) {
        navigate("/dashboard");
      } else {
        loadData();
      }
    }
  }, [isAdmin, adminLoading, navigate]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadProfessionals(), loadReferrals()]);
    setLoading(false);
  };

  const loadProfessionals = async () => {
    const { data, error } = await (supabase as any)
      .from('professionals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading professionals:', error);
      return;
    }

    setProfessionals(data || []);
    
    const total = data?.length || 0;
    const pending = data?.filter((p: Professional) => p.status === 'waiting_approval').length || 0;
    const approved = data?.filter((p: Professional) => p.status === 'approved').length || 0;
    
    setStats(prev => ({ ...prev, totalProfessionals: total, pendingApproval: pending, approved }));
  };

  const loadReferrals = async () => {
    const { data, error } = await (supabase as any)
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading referrals:', error);
      return;
    }

    setReferrals(data || []);
    setStats(prev => ({ ...prev, totalReferrals: data?.length || 0 }));
  };

  const updateProfessionalStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from('professionals')
      .update({ status })
      .eq('id', id);

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
      description: `Profesional ${status === 'approved' ? 'aprobado' : 'rechazado'}`,
    });

    loadData();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      waiting_approval: { variant: "secondary", label: "Pendiente" },
      approved: { variant: "default", label: "Aprobado" },
      rejected: { variant: "destructive", label: "Rechazado" },
      inactive: { variant: "outline", label: "Inactivo" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
        <p className="text-muted-foreground">Gestión completa del sistema CONECTOR</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Profesionales
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalProfessionals}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Pendientes
            </CardDescription>
            <CardTitle className="text-3xl">{stats.pendingApproval}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Aprobados
            </CardDescription>
            <CardTitle className="text-3xl">{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Referidos
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalReferrals}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="professionals" className="w-full">
        <TabsList>
          <TabsTrigger value="professionals">Profesionales</TabsTrigger>
          <TabsTrigger value="referrals">Referidos</TabsTrigger>
        </TabsList>

        <TabsContent value="professionals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Profesionales</CardTitle>
              <CardDescription>Aprobar o rechazar solicitudes de registro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {professionals.map((prof) => (
                  <div
                    key={prof.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{prof.full_name}</p>
                      <p className="text-sm text-muted-foreground">{prof.business_name}</p>
                      <p className="text-sm text-muted-foreground">{prof.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Registrado: {new Date(prof.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(prof.status)}
                      {prof.status === 'waiting_approval' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateProfessionalStatus(prof.id, 'approved')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateProfessionalStatus(prof.id, 'rejected')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Referidos</CardTitle>
              <CardDescription>Visualizar todos los referidos del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {referrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{ref.referred_email}</p>
                      <p className="text-sm text-muted-foreground">
                        Creado: {new Date(ref.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={ref.status === 'completed' ? 'default' : 'secondary'}>
                        {ref.status}
                      </Badge>
                      {ref.reward_points > 0 && (
                        <span className="text-sm font-medium text-primary">
                          +{ref.reward_points} pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
