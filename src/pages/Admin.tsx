import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Users, Gift, TrendingUp, Loader2, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Professional {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  business_name: string;
  position: string | null;
  bio: string | null;
  city: string;
  state: string;
  country: string | null;
  website: string | null;
  linkedin_url: string | null;
  sector_id: number;
  specialization_id: number;
  years_experience: number | null;
  status: string;
  created_at: string;
  sector_catalog?: { name: string };
  specializations?: { name: string };
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
      .select(`
        *,
        sector_catalog(name),
        specializations(name)
      `)
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

  const filteredProfessionals = professionals.filter((prof) => {
    if (statusFilter === "all") return true;
    return prof.status === statusFilter;
  });

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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Gestión de Profesionales</CardTitle>
                  <CardDescription>Aprobar o rechazar solicitudes de registro</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <ToggleGroup 
                    type="single" 
                    value={statusFilter} 
                    onValueChange={(value) => setStatusFilter(value || "all")}
                  >
                    <ToggleGroupItem value="all" aria-label="Todos">
                      Todos ({professionals.length})
                    </ToggleGroupItem>
                    <ToggleGroupItem value="waiting_approval" aria-label="Pendientes">
                      Pendientes ({stats.pendingApproval})
                    </ToggleGroupItem>
                    <ToggleGroupItem value="approved" aria-label="Aprobados">
                      Aprobados ({stats.approved})
                    </ToggleGroupItem>
                    <ToggleGroupItem value="rejected" aria-label="Rechazados">
                      Rechazados
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProfessionals.map((prof) => (
                  <Card key={prof.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-semibold text-lg">{prof.full_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {prof.company_name || prof.business_name}
                              </p>
                            </div>
                            {getStatusBadge(prof.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium">Email:</span> {prof.email}
                            </div>
                            {prof.phone && (
                              <div>
                                <span className="font-medium">Teléfono:</span> {prof.phone}
                              </div>
                            )}
                            {prof.position && (
                              <div>
                                <span className="font-medium">Posición:</span> {prof.position}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Ubicación:</span> {prof.city}, {prof.state}
                              {prof.country && `, ${prof.country}`}
                            </div>
                            {prof.sector_catalog && (
                              <div>
                                <span className="font-medium">Sector:</span> {prof.sector_catalog.name}
                              </div>
                            )}
                            {prof.specializations && (
                              <div>
                                <span className="font-medium">Especialización:</span> {prof.specializations.name}
                              </div>
                            )}
                            {prof.years_experience && (
                              <div>
                                <span className="font-medium">Experiencia:</span> {prof.years_experience} años
                              </div>
                            )}
                            {prof.website && (
                              <div>
                                <span className="font-medium">Web:</span>{' '}
                                <a 
                                  href={prof.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {prof.website}
                                </a>
                              </div>
                            )}
                            {prof.linkedin_url && (
                              <div>
                                <span className="font-medium">LinkedIn:</span>{' '}
                                <a 
                                  href={prof.linkedin_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  Ver perfil
                                </a>
                              </div>
                            )}
                          </div>

                          {prof.bio && (
                            <div className="pt-2 border-t">
                              <p className="text-sm">
                                <span className="font-medium">Bio:</span> {prof.bio}
                              </p>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground pt-2">
                            Registrado: {new Date(prof.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>

                        {prof.status === 'waiting_approval' && (
                          <div className="flex flex-col gap-2 md:min-w-[140px]">
                            <Button
                              size="sm"
                              onClick={() => updateProfessionalStatus(prof.id, 'approved')}
                              className="w-full"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateProfessionalStatus(prof.id, 'rejected')}
                              className="w-full"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredProfessionals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {statusFilter === "all" 
                      ? "No hay profesionales registrados" 
                      : `No hay profesionales con estado: ${getStatusBadge(statusFilter).props.children}`}
                  </div>
                )}
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
