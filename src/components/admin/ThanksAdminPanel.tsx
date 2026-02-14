import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Save, X, Tag, AlertTriangle, TrendingUp, Heart } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Sector {
  id: string;
  name: string;
  internal_coefficient_type: string;
  internal_coefficient_value: number;
  internal_coefficient_min: number | null;
  internal_coefficient_max: number | null;
  notes_internal: string | null;
  is_active: boolean;
}

interface Band {
  id: string;
  band_number: number;
  display_label: string;
  internal_min_estimated_income: number;
  internal_max_estimated_income: number;
  min_thanks_amount: number;
  recommended_thanks_amount: number;
  max_thanks_amount: number;
  is_active: boolean;
}

interface Disagreement {
  id: string;
  deal_id: string;
  reason: string;
  comment: string;
  status: string;
  resolution_type: string | null;
  created_at: string;
  opened_by: { full_name: string } | null;
  deals: {
    description: string;
    estimated_total_volume: number | null;
    thanks_amount_selected: number | null;
    thanks_amount_status: string;
    referrer: { full_name: string } | null;
    receiver: { full_name: string } | null;
    thanks_category_bands: { display_label: string } | null;
  } | null;
}

interface ReputationMetric {
  id: string;
  professional_id: string;
  generosity_index: number;
  avg_thanks_vs_recommended: number;
  disagreement_rate: number;
  underpay_flags_count: number;
  total_thanks_given: number;
  total_thanks_received: number;
  professional: { full_name: string } | null;
}

export const ThanksAdminPanel = () => {
  const { toast } = useToast();

  return (
    <Tabs defaultValue="sectors" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="sectors">Sectores</TabsTrigger>
        <TabsTrigger value="bands">Tramos</TabsTrigger>
        <TabsTrigger value="disagreements">Disputas</TabsTrigger>
        <TabsTrigger value="reputation">Reputación</TabsTrigger>
      </TabsList>

      <TabsContent value="sectors"><SectorsTab /></TabsContent>
      <TabsContent value="bands"><BandsTab /></TabsContent>
      <TabsContent value="disagreements"><DisagreementsTab /></TabsContent>
      <TabsContent value="reputation"><ReputationTab /></TabsContent>
    </Tabs>
  );
};

// ─── SECTORS TAB ────────────────────────────────────────────────
const SectorsTab = () => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Sector>>({});
  const { toast } = useToast();

  useEffect(() => { loadSectors(); }, []);

  const loadSectors = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("thanks_sectors")
      .select("*")
      .order("name");
    setSectors(data || []);
    setLoading(false);
  };

  const startEdit = (s: Sector) => {
    setEditingId(s.id);
    setEditForm({ ...s });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await (supabase as any)
      .from("thanks_sectors")
      .update({
        name: editForm.name,
        internal_coefficient_value: editForm.internal_coefficient_value,
        internal_coefficient_min: editForm.internal_coefficient_min,
        internal_coefficient_max: editForm.internal_coefficient_max,
        notes_internal: editForm.notes_internal,
        is_active: editForm.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sector actualizado" });
    cancelEdit();
    loadSectors();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />Sectores y Coeficientes</CardTitle>
        <CardDescription>Ajusta los coeficientes internos por sector. El usuario nunca ve estos valores.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sector</TableHead>
              <TableHead>Coeficiente</TableHead>
              <TableHead>Mín</TableHead>
              <TableHead>Máx</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sectors.map((s) => (
              <TableRow key={s.id}>
                {editingId === s.id ? (
                  <>
                    <TableCell>
                      <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={editForm.internal_coefficient_value || 0} onChange={(e) => setEditForm({ ...editForm, internal_coefficient_value: parseFloat(e.target.value) })} className="h-8 w-20" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={editForm.internal_coefficient_min || 0} onChange={(e) => setEditForm({ ...editForm, internal_coefficient_min: parseFloat(e.target.value) })} className="h-8 w-20" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={editForm.internal_coefficient_max || 0} onChange={(e) => setEditForm({ ...editForm, internal_coefficient_max: parseFloat(e.target.value) })} className="h-8 w-20" />
                    </TableCell>
                    <TableCell>
                      <Input value={editForm.notes_internal || ""} onChange={(e) => setEditForm({ ...editForm, notes_internal: e.target.value })} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <Select value={editForm.is_active ? "true" : "false"} onValueChange={(v) => setEditForm({ ...editForm, is_active: v === "true" })}>
                        <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Activo</SelectItem>
                          <SelectItem value="false">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={saveEdit}><Save className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{(s.internal_coefficient_value * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-muted-foreground">{s.internal_coefficient_min != null ? `${(s.internal_coefficient_min * 100).toFixed(0)}%` : "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.internal_coefficient_max != null ? `${(s.internal_coefficient_max * 100).toFixed(0)}%` : "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{s.notes_internal || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Activo" : "Inactivo"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ─── BANDS TAB ────────────────────────────────────────────────
const BandsTab = () => {
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Band>>({});
  const { toast } = useToast();

  useEffect(() => { loadBands(); }, []);

  const loadBands = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("thanks_category_bands")
      .select("*")
      .order("band_number");
    setBands(data || []);
    setLoading(false);
  };

  const startEdit = (b: Band) => {
    setEditingId(b.id);
    setEditForm({ ...b });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await (supabase as any)
      .from("thanks_category_bands")
      .update({
        display_label: editForm.display_label,
        internal_min_estimated_income: editForm.internal_min_estimated_income,
        internal_max_estimated_income: editForm.internal_max_estimated_income,
        min_thanks_amount: editForm.min_thanks_amount,
        recommended_thanks_amount: editForm.recommended_thanks_amount,
        max_thanks_amount: editForm.max_thanks_amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tramo actualizado" });
    cancelEdit();
    loadBands();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Tramos de Agradecimiento (T1–T10)</CardTitle>
        <CardDescription>Define los rangos de ingreso interno y los importes de agradecimiento por tramo.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tramo</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead>Ingreso Mín (interno)</TableHead>
              <TableHead>Ingreso Máx (interno)</TableHead>
              <TableHead>Mín €</TableHead>
              <TableHead>Rec €</TableHead>
              <TableHead>Máx €</TableHead>
              <TableHead className="w-[100px]">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bands.map((b) => (
              <TableRow key={b.id}>
                {editingId === b.id ? (
                  <>
                    <TableCell className="font-medium">T{b.band_number}</TableCell>
                    <TableCell>
                      <Input value={editForm.display_label || ""} onChange={(e) => setEditForm({ ...editForm, display_label: e.target.value })} className="h-8 w-32" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={editForm.internal_min_estimated_income || 0} onChange={(e) => setEditForm({ ...editForm, internal_min_estimated_income: parseFloat(e.target.value) })} className="h-8 w-24" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={editForm.internal_max_estimated_income || 0} onChange={(e) => setEditForm({ ...editForm, internal_max_estimated_income: parseFloat(e.target.value) })} className="h-8 w-24" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={editForm.min_thanks_amount || 0} onChange={(e) => setEditForm({ ...editForm, min_thanks_amount: parseFloat(e.target.value) })} className="h-8 w-20" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={editForm.recommended_thanks_amount || 0} onChange={(e) => setEditForm({ ...editForm, recommended_thanks_amount: parseFloat(e.target.value) })} className="h-8 w-20" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={editForm.max_thanks_amount || 0} onChange={(e) => setEditForm({ ...editForm, max_thanks_amount: parseFloat(e.target.value) })} className="h-8 w-20" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={saveEdit}><Save className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">T{b.band_number}</TableCell>
                    <TableCell>{b.display_label}</TableCell>
                    <TableCell className="text-muted-foreground">{b.internal_min_estimated_income.toLocaleString("es-ES")}€</TableCell>
                    <TableCell className="text-muted-foreground">{b.internal_max_estimated_income >= 999999 ? "∞" : `${b.internal_max_estimated_income.toLocaleString("es-ES")}€`}</TableCell>
                    <TableCell>{b.min_thanks_amount}€</TableCell>
                    <TableCell className="font-medium text-primary">{b.recommended_thanks_amount}€</TableCell>
                    <TableCell>{b.max_thanks_amount}€</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ─── DISAGREEMENTS TAB ────────────────────────────────────────
const DisagreementsTab = () => {
  const [disagreements, setDisagreements] = useState<Disagreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolutionType, setResolutionType] = useState("no_change");
  const { toast } = useToast();

  useEffect(() => { loadDisagreements(); }, []);

  const loadDisagreements = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("deal_disagreements")
      .select(`
        *,
        opened_by:professionals!deal_disagreements_opened_by_id_fkey(full_name),
        deals(
          description, estimated_total_volume, thanks_amount_selected, thanks_amount_status,
          referrer:professionals!deals_referrer_id_fkey(full_name),
          receiver:professionals!deals_receiver_id_fkey(full_name),
          thanks_category_bands(display_label)
        )
      `)
      .order("created_at", { ascending: false });
    setDisagreements(data || []);
    setLoading(false);
  };

  const resolveDisagreement = async (id: string, dealId: string) => {
    const { error } = await (supabase as any)
      .from("deal_disagreements")
      .update({
        status: "resolved",
        resolution_type: resolutionType,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Revert deal from disputed if resolved
    await (supabase as any)
      .from("deals")
      .update({ status: "completed" })
      .eq("id", dealId)
      .eq("status", "disputed");

    toast({ title: "Disputa resuelta" });
    setResolving(null);
    loadDisagreements();
  };

  const getReasonLabel = (r: string) => {
    const map: Record<string, string> = {
      value_not_reflected: "El valor no refleja la realidad",
      partial_scope: "Alcance parcial",
      different_margin_model: "Modelo de margen diferente",
      other: "Otro motivo",
    };
    return map[r] || r;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Disputas de Agradecimiento</CardTitle>
        <CardDescription>Revisa y resuelve las disputas abiertas por los miembros.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {disagreements.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay disputas registradas</p>
        ) : (
          disagreements.map((d) => (
            <Card key={d.id} className={d.status === "open" ? "border-destructive/40" : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {d.deals?.referrer?.full_name} → {d.deals?.receiver?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.deals?.thanks_category_bands?.display_label} · {d.deals?.thanks_amount_selected != null && `${d.deals.thanks_amount_selected}€`}
                    </p>
                  </div>
                  <Badge variant={d.status === "open" ? "destructive" : "default"}>
                    {d.status === "open" ? "Abierta" : "Resuelta"}
                  </Badge>
                </div>

                <div className="bg-muted/50 rounded p-3 space-y-1">
                  <p className="text-xs font-medium">{getReasonLabel(d.reason)}</p>
                  <p className="text-sm">{d.comment}</p>
                  <p className="text-xs text-muted-foreground">
                    Abierta por {d.opened_by?.full_name} · {format(new Date(d.created_at), "d MMM yyyy", { locale: es })}
                  </p>
                </div>

                {d.resolution_type && (
                  <p className="text-xs text-muted-foreground">
                    Resolución: {d.resolution_type === "band_adjusted" ? "Tramo ajustado" : d.resolution_type === "amount_adjusted_within_band" ? "Importe ajustado" : "Sin cambios"}
                  </p>
                )}

                {d.status === "open" && (
                  <div className="flex items-center gap-2">
                    {resolving === d.id ? (
                      <>
                        <Select value={resolutionType} onValueChange={setResolutionType}>
                          <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_change">Sin cambios</SelectItem>
                            <SelectItem value="amount_adjusted_within_band">Ajustar importe</SelectItem>
                            <SelectItem value="band_adjusted">Ajustar tramo</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => resolveDisagreement(d.id, d.deal_id)}>Resolver</Button>
                        <Button size="sm" variant="ghost" onClick={() => setResolving(null)}>Cancelar</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setResolving(d.id); setResolutionType("no_change"); }}>
                        Resolver disputa
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};

// ─── REPUTATION TAB ────────────────────────────────────────────
const ReputationTab = () => {
  const [metrics, setMetrics] = useState<ReputationMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMetrics(); }, []);

  const loadMetrics = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("thanks_reputation_metrics")
      .select("*, professional:professionals!thanks_reputation_metrics_professional_id_fkey(full_name)")
      .order("generosity_index", { ascending: true });
    setMetrics(data || []);
    setLoading(false);
  };

  const getGenerosityColor = (idx: number) => {
    if (idx >= 1.1) return "text-green-600";
    if (idx >= 0.9) return "";
    if (idx >= 0.7) return "text-orange-500";
    return "text-destructive";
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" />Reputación y Antifraude</CardTitle>
        <CardDescription>Métricas de comportamiento de los miembros. Los flags rojos son silenciosos y nunca se muestran al usuario.</CardDescription>
      </CardHeader>
      <CardContent>
        {metrics.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aún no hay métricas de reputación registradas</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profesional</TableHead>
                <TableHead>Generosidad</TableHead>
                <TableHead>vs Recomendado</TableHead>
                <TableHead>Tasa Disputas</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Dados</TableHead>
                <TableHead>Recibidos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.professional?.full_name || "—"}</TableCell>
                  <TableCell className={getGenerosityColor(m.generosity_index)}>
                    {m.generosity_index.toFixed(2)}
                  </TableCell>
                  <TableCell>{(m.avg_thanks_vs_recommended * 100).toFixed(0)}%</TableCell>
                  <TableCell>{(m.disagreement_rate * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    {m.underpay_flags_count > 0 ? (
                      <Badge variant="destructive" className="text-xs">{m.underpay_flags_count} flags</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">0</span>
                    )}
                  </TableCell>
                  <TableCell>{m.total_thanks_given}</TableCell>
                  <TableCell>{m.total_thanks_received}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
