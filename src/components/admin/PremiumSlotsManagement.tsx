import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sparkles, Trash2, Edit, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PremiumSlotsManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("active");
  const [slots, setSlots] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const [newSlot, setNewSlot] = useState({
    slot_number: "",
    company_name: "",
    company_logo_url: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
    description: "",
    category_id: "",
    is_external_company: true,
    contract_start_date: "",
    contract_end_date: "",
    contract_reference: "",
    is_featured: false,
    display_order: 0,
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("offer_categories")
        .select("*")
        .order("name");
      if (categoriesData) setCategories(categoriesData);

      // Fetch active slots
      const { data: slotsData } = await supabase
        .from("premium_marketplace_slots")
        .select("*, category:offer_categories(name)")
        .order("slot_number");
      if (slotsData) setSlots(slotsData);

      // Fetch waitlist
      const { data: waitlistData } = await supabase
        .from("marketplace_waitlist")
        .select("*")
        .order("position_in_queue");
      if (waitlistData) setWaitlist(waitlistData);

      // Fetch analytics
      if (activeTab === "analytics") {
        const { data: viewsData } = await supabase
          .from("premium_slot_views")
          .select(`
            slot_id,
            premium_marketplace_slots(company_name)
          `);

        if (viewsData) {
          const viewsBySlot = viewsData.reduce((acc: any, view: any) => {
            const slotName = view.premium_marketplace_slots?.company_name;
            if (slotName) {
              acc[slotName] = (acc[slotName] || 0) + 1;
            }
            return acc;
          }, {});

          setAnalytics({
            totalViews: viewsData.length,
            viewsBySlot,
            activeSlots: slotsData?.filter((s) => s.status === "active").length || 0,
            waitlistCount: waitlistData?.length || 0,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("premium_marketplace_slots").insert({
        ...newSlot,
        slot_number: parseInt(newSlot.slot_number),
        category_id: parseInt(newSlot.category_id),
        display_order: newSlot.display_order,
      });
      if (error) throw error;

      toast({
        title: "Slot creado",
        description: "El espacio publicitario se creó exitosamente",
      });

      setNewSlot({
        slot_number: "",
        company_name: "",
        company_logo_url: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        website_url: "",
        description: "",
        category_id: "",
        is_external_company: true,
        contract_start_date: "",
        contract_end_date: "",
        contract_reference: "",
        is_featured: false,
        display_order: 0,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("premium_marketplace_slots")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Slot eliminado",
        description: "El espacio publicitario se eliminó exitosamente",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleUpdateWaitlistStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("marketplace_waitlist")
        .update({ status, contacted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El estado de la solicitud se actualizó exitosamente",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Gestión de Plaza Premium</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Slots Activos</TabsTrigger>
          <TabsTrigger value="waitlist">Lista de Espera</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="new">Nuevo Slot</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slot</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell className="font-bold">#{slot.slot_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{slot.company_name}</p>
                        <p className="text-sm text-muted-foreground">{slot.category?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{slot.contact_name}</p>
                        <p className="text-muted-foreground">{slot.contact_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={slot.status === "active" ? "default" : "secondary"}>
                        {slot.status}
                      </Badge>
                      {slot.is_featured && (
                        <Badge variant="outline" className="ml-2">Destacado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>Inicio: {format(new Date(slot.contract_start_date), "dd/MM/yyyy", { locale: es })}</p>
                      <p>Fin: {format(new Date(slot.contract_end_date), "dd/MM/yyyy", { locale: es })}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSlot(slot)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteId(slot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="waitlist" className="space-y-4">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posición</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold">#{item.position_in_queue}</TableCell>
                    <TableCell>{item.company_name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{item.contact_name}</p>
                        <p className="text-muted-foreground">{item.contact_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(item.requested_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "waiting"
                            ? "secondary"
                            : item.status === "contacted"
                            ? "outline"
                            : item.status === "converted"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateWaitlistStatus(item.id, "contacted")}
                          disabled={item.status !== "waiting"}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateWaitlistStatus(item.id, "declined")}
                          disabled={item.status !== "waiting"}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Total Vistas</h3>
                </div>
                <p className="text-3xl font-bold mt-2">{analytics.totalViews}</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold">Slots Activos</h3>
                </div>
                <p className="text-3xl font-bold mt-2">{analytics.activeSlots} / 30</p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold">Lista de Espera</h3>
                </div>
                <p className="text-3xl font-bold mt-2">{analytics.waitlistCount}</p>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <Card className="p-6">
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="slot_number">Número de Slot (1-30)</Label>
                  <Input
                    id="slot_number"
                    type="number"
                    min="1"
                    max="30"
                    value={newSlot.slot_number}
                    onChange={(e) => setNewSlot({ ...newSlot, slot_number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company_name">Nombre de la Empresa</Label>
                  <Input
                    id="company_name"
                    value={newSlot.company_name}
                    onChange={(e) => setNewSlot({ ...newSlot, company_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Nombre de Contacto</Label>
                  <Input
                    id="contact_name"
                    value={newSlot.contact_name}
                    onChange={(e) => setNewSlot({ ...newSlot, contact_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email">Email de Contacto</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={newSlot.contact_email}
                    onChange={(e) => setNewSlot({ ...newSlot, contact_email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_phone">Teléfono</Label>
                  <Input
                    id="contact_phone"
                    value={newSlot.contact_phone}
                    onChange={(e) => setNewSlot({ ...newSlot, contact_phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category_id">Categoría</Label>
                  <Select
                    value={newSlot.category_id}
                    onValueChange={(value) => setNewSlot({ ...newSlot, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newSlot.description}
                  onChange={(e) => setNewSlot({ ...newSlot, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contract_start_date">Fecha Inicio Contrato</Label>
                  <Input
                    id="contract_start_date"
                    type="date"
                    value={newSlot.contract_start_date}
                    onChange={(e) => setNewSlot({ ...newSlot, contract_start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contract_end_date">Fecha Fin Contrato</Label>
                  <Input
                    id="contract_end_date"
                    type="date"
                    value={newSlot.contract_end_date}
                    onChange={(e) => setNewSlot({ ...newSlot, contract_end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Crear Slot Premium
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar slot premium?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El espacio publicitario será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSlot}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
