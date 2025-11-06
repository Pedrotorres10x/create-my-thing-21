import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Users, Gift, TrendingUp, Loader2, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown, Eye, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfessionalDetailsModal } from "@/components/ProfessionalDetailsModal";
import { StatusDistributionChart } from "@/components/admin/StatusDistributionChart";
import { SectorDistributionChart } from "@/components/admin/SectorDistributionChart";
import { RegistrationTrendChart } from "@/components/admin/RegistrationTrendChart";
import { BarChart3 } from "lucide-react";

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
  address: string | null;
  postal_code: string | null;
  website: string | null;
  linkedin_url: string | null;
  logo_url: string | null;
  photo_url: string | null;
  video_url: string | null;
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
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<"created_at" | "full_name" | "email" | "status">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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

    // Send email notification
    try {
      const { error: emailError } = await supabase.functions.invoke('send-professional-status-email', {
        body: { 
          professionalId: id, 
          status: status as "approved" | "rejected"
        }
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
        toast({
          title: "Advertencia",
          description: "Estado actualizado pero el email no se pudo enviar",
          variant: "default",
        });
      } else {
        toast({
          title: "Éxito",
          description: `Profesional ${status === 'approved' ? 'aprobado' : 'rechazado'} y notificado por email`,
        });
      }
    } catch (emailError) {
      console.error("Error sending email notification:", emailError);
      toast({
        title: "Advertencia",
        description: "Estado actualizado pero el email no se pudo enviar",
        variant: "default",
      });
    }

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

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-muted-foreground" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const handleViewDetails = (prof: Professional) => {
    setSelectedProfessional(prof);
    setModalOpen(true);
  };

  const exportToCSV = () => {
    // CSV headers
    const headers = [
      "Nombre Completo",
      "Email",
      "Teléfono",
      "Empresa",
      "Nombre de Negocio",
      "Posición",
      "Ciudad",
      "Estado",
      "País",
      "Dirección",
      "Código Postal",
      "Sector",
      "Especialización",
      "Años de Experiencia",
      "Estado",
      "Sitio Web",
      "LinkedIn",
      "Bio",
      "Fecha de Registro",
    ];

    // Convert professionals to CSV rows
    const rows = sortedProfessionals.map((prof) => [
      prof.full_name,
      prof.email,
      prof.phone || "",
      prof.company_name || "",
      prof.business_name || "",
      prof.position || "",
      prof.city,
      prof.state,
      prof.country || "",
      prof.address || "",
      prof.postal_code || "",
      prof.sector_catalog?.name || "",
      prof.specializations?.name || "",
      prof.years_experience || "",
      prof.status,
      prof.website || "",
      prof.linkedin_url || "",
      prof.bio || "",
      new Date(prof.created_at).toLocaleString("es-MX"),
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => 
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `profesionales_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${sortedProfessionals.length} profesionales a CSV`,
    });
  };

  const filteredProfessionals = professionals.filter((prof) => {
    // Filter by status
    if (statusFilter !== "all" && prof.status !== statusFilter) {
      return false;
    }

    // Filter by search term
    if (searchTerm.trim() !== "") {
      const search = searchTerm.toLowerCase();
      const matchesName = prof.full_name.toLowerCase().includes(search);
      const matchesEmail = prof.email.toLowerCase().includes(search);
      const matchesCompany = (prof.company_name || prof.business_name || "").toLowerCase().includes(search);
      
      return matchesName || matchesEmail || matchesCompany;
    }

    return true;
  });

  // Sort professionals
  const sortedProfessionals = [...filteredProfessionals].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case "full_name":
        comparison = a.full_name.localeCompare(b.full_name);
        break;
      case "email":
        comparison = a.email.localeCompare(b.email);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "created_at":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedProfessionals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProfessionals = sortedProfessionals.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, itemsPerPage]);

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

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="professionals">Profesionales</TabsTrigger>
          <TabsTrigger value="referrals">Referidos</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatusDistributionChart professionals={professionals} />
            <SectorDistributionChart professionals={professionals} />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <RegistrationTrendChart professionals={professionals} />
          </div>
        </TabsContent>

        <TabsContent value="professionals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Gestión de Profesionales</CardTitle>
                    <CardDescription>Aprobar o rechazar solicitudes de registro</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Button
                      onClick={exportToCSV}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={sortedProfessionals.length === 0}
                    >
                      <Download className="w-4 h-4" />
                      Exportar CSV ({sortedProfessionals.length})
                    </Button>
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
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, email o empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground self-center">Ordenar por:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort("created_at")}
                    className="gap-1"
                  >
                    Fecha registro
                    {getSortIcon("created_at")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort("full_name")}
                    className="gap-1"
                  >
                    Nombre
                    {getSortIcon("full_name")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort("email")}
                    className="gap-1"
                  >
                    Email
                    {getSortIcon("email")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort("status")}
                    className="gap-1"
                  >
                    Estado
                    {getSortIcon("status")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedProfessionals.map((prof) => (
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

                        <div className="flex flex-col gap-2 md:min-w-[140px]">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(prof)}
                            className="w-full"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalles
                          </Button>
                          {prof.status === 'waiting_approval' && (
                            <>
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
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredProfessionals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm.trim() !== "" 
                      ? `No se encontraron profesionales con "${searchTerm}"`
                      : statusFilter === "all" 
                        ? "No hay profesionales registrados" 
                        : `No hay profesionales con estado: ${getStatusBadge(statusFilter).props.children}`}
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {startIndex + 1}-{Math.min(endIndex, sortedProfessionals.length)} de {sortedProfessionals.length} profesionales
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Items por página:</span>
                      <Select 
                        value={itemsPerPage.toString()} 
                        onValueChange={(value) => setItemsPerPage(Number(value))}
                      >
                        <SelectTrigger className="w-[80px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage = 
                          page === 1 || 
                          page === totalPages || 
                          (page >= currentPage - 1 && page <= currentPage + 1);
                        
                        if (!showPage) {
                          // Show ellipsis for skipped pages
                          if (page === currentPage - 2 || page === currentPage + 2) {
                            return (
                              <PaginationItem key={page}>
                                <span className="px-2">...</span>
                              </PaginationItem>
                            );
                          }
                          return null;
                        }

                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
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

      <ProfessionalDetailsModal
        professional={selectedProfessional}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
};

export default Admin;
