import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit, Eye, MousePointerClick, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Banner {
  id: string;
  campaign_name: string;
  company_name: string;
  banner_image_url: string;
  banner_size: string;
  click_url: string;
  target_location: string;
  is_active: boolean;
  display_priority: number;
  start_date: string;
  end_date: string;
  daily_impression_limit: number | null;
  total_impression_limit: number | null;
  monthly_price: number | null;
  notes: string | null;
  created_at: string;
}

interface BannerStats {
  impressions: number;
  clicks: number;
  ctr: number;
}

export const BannerManagement = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, BannerStats>>({});
  const [totalRevenue, setTotalRevenue] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    campaign_name: "",
    company_name: "",
    banner_image_url: "",
    banner_size: "horizontal_large",
    click_url: "",
    target_location: "dashboard",
    display_priority: 5,
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    daily_impression_limit: "",
    total_impression_limit: "",
    monthly_price: "",
    notes: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("premium_ad_banners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBanners(data || []);

      // Calculate revenue
      const activeRevenue = (data || [])
        .filter(b => b.is_active && new Date(b.end_date) > new Date())
        .reduce((sum, b) => sum + (b.monthly_price || 0), 0);
      
      setTotalRevenue(activeRevenue);

      // Fetch stats for each banner
      for (const banner of data || []) {
        await fetchBannerStats(banner.id);
      }
    } catch (error: any) {
      console.error("Error fetching banners:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los banners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBannerStats = async (bannerId: string) => {
    try {
      const { count: impressionCount } = await supabase
        .from("banner_impressions")
        .select("*", { count: "exact", head: true })
        .eq("banner_id", bannerId);

      const { count: clickCount } = await supabase
        .from("banner_clicks")
        .select("*", { count: "exact", head: true })
        .eq("banner_id", bannerId);

      const impressions = impressionCount || 0;
      const clicks = clickCount || 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      setStats(prev => ({
        ...prev,
        [bannerId]: {
          impressions,
          clicks,
          ctr: Number(ctr.toFixed(2))
        }
      }));
    } catch (error) {
      console.error("Error fetching banner stats:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const bannerData = {
        campaign_name: formData.campaign_name,
        company_name: formData.company_name,
        banner_image_url: formData.banner_image_url,
        banner_size: formData.banner_size,
        click_url: formData.click_url,
        target_location: formData.target_location,
        display_priority: formData.display_priority,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        daily_impression_limit: formData.daily_impression_limit ? parseInt(formData.daily_impression_limit) : null,
        total_impression_limit: formData.total_impression_limit ? parseInt(formData.total_impression_limit) : null,
        monthly_price: formData.monthly_price ? parseFloat(formData.monthly_price) : null,
        notes: formData.notes || null,
        is_active: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from("premium_ad_banners")
          .update(bannerData)
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Banner actualizado",
          description: "El banner se ha actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from("premium_ad_banners")
          .insert(bannerData);

        if (error) throw error;

        toast({
          title: "Banner creado",
          description: "El banner se ha creado correctamente",
        });
      }

      resetForm();
      fetchBanners();
    } catch (error: any) {
      console.error("Error saving banner:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el banner",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    setFormData({
      campaign_name: banner.campaign_name,
      company_name: banner.company_name,
      banner_image_url: banner.banner_image_url,
      banner_size: banner.banner_size,
      click_url: banner.click_url,
      target_location: banner.target_location,
      display_priority: banner.display_priority,
      start_date: banner.start_date.split('T')[0],
      end_date: banner.end_date.split('T')[0],
      daily_impression_limit: banner.daily_impression_limit?.toString() || "",
      total_impression_limit: banner.total_impression_limit?.toString() || "",
      monthly_price: banner.monthly_price?.toString() || "",
      notes: banner.notes || "",
    });
    setEditingId(banner.id);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("premium_ad_banners")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Banner eliminado",
        description: "El banner se ha eliminado correctamente",
      });

      fetchBanners();
    } catch (error: any) {
      console.error("Error deleting banner:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el banner",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("premium_ad_banners")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: currentActive ? "Banner desactivado" : "Banner activado",
        description: `El banner se ha ${currentActive ? 'desactivado' : 'activado'} correctamente`,
      });

      fetchBanners();
    } catch (error: any) {
      console.error("Error toggling banner:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del banner",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      campaign_name: "",
      company_name: "",
      banner_image_url: "",
      banner_size: "horizontal_large",
      click_url: "",
      target_location: "dashboard",
      display_priority: 5,
      start_date: new Date().toISOString().split('T')[0],
      end_date: "",
      daily_impression_limit: "",
      total_impression_limit: "",
      monthly_price: "",
      notes: "",
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Banners Activos</TabsTrigger>
          <TabsTrigger value="create">Crear/Editar</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Active Banners Tab */}
        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : banners.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay banners creados
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {banners.map((banner) => (
                <Card key={banner.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{banner.campaign_name}</CardTitle>
                        <CardDescription>{banner.company_name}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={banner.is_active ? "default" : "secondary"}>
                          {banner.is_active ? "Activo" : "Pausado"}
                        </Badge>
                        {new Date(banner.end_date) < new Date() && (
                          <Badge variant="destructive">Expirado</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Banner Preview */}
                    <div className="w-full h-32 rounded-lg overflow-hidden border">
                      <img 
                        src={banner.banner_image_url} 
                        alt={banner.campaign_name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Stats */}
                    {stats[banner.id] && (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span>{stats[banner.id].impressions.toLocaleString()} impresiones</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                          <span>{stats[banner.id].clicks.toLocaleString()} clicks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span>CTR: {stats[banner.id].ctr}%</span>
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Ubicación: {banner.target_location}</p>
                      <p>Prioridad: {banner.display_priority}</p>
                      <p>Fecha: {new Date(banner.start_date).toLocaleDateString()} - {new Date(banner.end_date).toLocaleDateString()}</p>
                      {banner.monthly_price && <p>Precio mensual: €{banner.monthly_price.toLocaleString()}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(banner)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(banner.id, banner.is_active)}
                      >
                        {banner.is_active ? "Pausar" : "Activar"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar banner?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminarán también todas las métricas asociadas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(banner.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Create/Edit Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Editar Banner" : "Crear Nuevo Banner"}</CardTitle>
              <CardDescription>
                Configura la campaña publicitaria premium
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign_name">Nombre de Campaña *</Label>
                    <Input
                      id="campaign_name"
                      value={formData.campaign_name}
                      onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_name">Empresa *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner_image_url">URL de la Imagen del Banner *</Label>
                  <Input
                    id="banner_image_url"
                    type="url"
                    value={formData.banner_image_url}
                    onChange={(e) => setFormData({ ...formData, banner_image_url: e.target.value })}
                    placeholder="https://..."
                    required
                  />
                  {formData.banner_image_url && (
                    <div className="mt-2">
                      <img 
                        src={formData.banner_image_url} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="banner_size">Tamaño del Banner *</Label>
                    <Select
                      value={formData.banner_size}
                      onValueChange={(value) => setFormData({ ...formData, banner_size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal_large">Horizontal Grande</SelectItem>
                        <SelectItem value="horizontal_small">Horizontal Pequeño</SelectItem>
                        <SelectItem value="sidebar">Sidebar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_location">Ubicación *</Label>
                    <Select
                      value={formData.target_location}
                      onValueChange={(value) => setFormData({ ...formData, target_location: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashboard">Panel Principal</SelectItem>
                        <SelectItem value="feed">Feed</SelectItem>
                        
                        <SelectItem value="all">Todas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="click_url">URL de Destino *</Label>
                  <Input
                    id="click_url"
                    type="url"
                    value={formData.click_url}
                    onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
                    placeholder="https://..."
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_priority">Prioridad (1-10) *</Label>
                    <Input
                      id="display_priority"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.display_priority}
                      onChange={(e) => setFormData({ ...formData, display_priority: parseInt(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Fecha Inicio *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">Fecha Fin *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="daily_impression_limit">Límite Diario Impresiones</Label>
                    <Input
                      id="daily_impression_limit"
                      type="number"
                      value={formData.daily_impression_limit}
                      onChange={(e) => setFormData({ ...formData, daily_impression_limit: e.target.value })}
                      placeholder="Sin límite"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_impression_limit">Límite Total Impresiones</Label>
                    <Input
                      id="total_impression_limit"
                      type="number"
                      value={formData.total_impression_limit}
                      onChange={(e) => setFormData({ ...formData, total_impression_limit: e.target.value })}
                      placeholder="Sin límite"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthly_price">Precio Mensual (€)</Label>
                    <Input
                      id="monthly_price"
                      type="number"
                      step="0.01"
                      value={formData.monthly_price}
                      onChange={(e) => setFormData({ ...formData, monthly_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {editingId ? "Actualizar Banner" : "Crear Banner"}
                      </>
                    )}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid gap-4">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Revenue Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">€{totalRevenue.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Banners activos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Campañas Activas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {banners.filter(b => b.is_active && new Date(b.end_date) > new Date()).length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">En ejecución</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Impresiones Totales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {Object.values(stats).reduce((sum, s) => sum + s.impressions, 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Todas las campañas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    CTR Promedio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {Object.values(stats).length > 0
                        ? (Object.values(stats).reduce((sum, s) => sum + s.ctr, 0) / Object.values(stats).length).toFixed(2)
                        : "0"}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Click-through rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Banners */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Banners por Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {banners
                    .filter(b => stats[b.id])
                    .sort((a, b) => (stats[b.id]?.ctr || 0) - (stats[a.id]?.ctr || 0))
                    .slice(0, 5)
                    .map((banner) => (
                      <div key={banner.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{banner.campaign_name}</h4>
                          <p className="text-sm text-muted-foreground">{banner.company_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">CTR: {stats[banner.id]?.ctr}%</p>
                          <p className="text-xs text-muted-foreground">
                            {stats[banner.id]?.impressions} imp. / {stats[banner.id]?.clicks} clicks
                          </p>
                        </div>
                      </div>
                    ))}
                  {banners.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No hay datos disponibles
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
