import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Chapter {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  description: string | null;
  meeting_schedule: string | null;
  location_details: string | null;
  member_count: number;
}

interface Professional {
  id: string;
  full_name: string;
  city: string;
  state: string;
}

export const ChapterManagement = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    city: "",
    state: "",
    country: "España",
    description: "",
    meeting_schedule: "",
    location_details: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chaptersRes, professionalsRes] = await Promise.all([
        supabase.from('chapters').select('*').order('name'),
        supabase
          .from('professionals')
          .select('id, full_name, city, state')
          .eq('status', 'approved')
          .is('chapter_id', null)
      ]);

      if (chaptersRes.data) setChapters(chaptersRes.data);
      if (professionalsRes.data) setProfessionals(professionalsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingChapter) {
        const { error } = await supabase
          .from('chapters')
          .update(formData)
          .eq('id', editingChapter.id);

        if (error) throw error;
        toast({ title: "Capítulo actualizado correctamente" });
      } else {
        const { error } = await supabase
          .from('chapters')
          .insert([formData]);

        if (error) throw error;
        toast({ title: "Capítulo creado correctamente" });
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving chapter:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el capítulo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setFormData({
      name: chapter.name,
      city: chapter.city,
      state: chapter.state,
      country: chapter.country,
      description: chapter.description || "",
      meeting_schedule: chapter.meeting_schedule || "",
      location_details: chapter.location_details || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      city: "",
      state: "",
      country: "España",
      description: "",
      meeting_schedule: "",
      location_details: "",
    });
    setEditingChapter(null);
  };

  const assignProfessionalToChapter = async (professionalId: string, chapterId: string) => {
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ chapter_id: chapterId })
        .eq('id', professionalId);

      if (error) throw error;

      toast({ title: "Profesional asignado al capítulo" });
      loadData();
    } catch (error) {
      console.error('Error assigning professional:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar el profesional",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Capítulos</h2>
          <p className="text-muted-foreground">Crea y gestiona capítulos locales</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Capítulo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingChapter ? "Editar Capítulo" : "Crear Nuevo Capítulo"}
              </DialogTitle>
              <DialogDescription>
                Completa la información del capítulo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Capítulo *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Capítulo Madrid Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Madrid"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Comunidad Autónoma *</Label>
                  <Input
                    id="state"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Comunidad de Madrid"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el capítulo y sus objetivos..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting_schedule">Calendario de Reuniones</Label>
                <Input
                  id="meeting_schedule"
                  value={formData.meeting_schedule}
                  onChange={(e) => setFormData({ ...formData, meeting_schedule: e.target.value })}
                  placeholder="Ej: Todos los martes a las 18:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_details">Detalles de Ubicación</Label>
                <Textarea
                  id="location_details"
                  value={formData.location_details}
                  onChange={(e) => setFormData({ ...formData, location_details: e.target.value })}
                  placeholder="Dirección y detalles de dónde se reúnen..."
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {editingChapter ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chapters List */}
      <div className="grid gap-4 md:grid-cols-2">
        {chapters.map((chapter) => (
          <Card key={chapter.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{chapter.name}</CardTitle>
                  <CardDescription>
                    {chapter.city}, {chapter.state}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(chapter)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {chapter.description && (
                <p className="text-sm text-muted-foreground">{chapter.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>{chapter.member_count} miembros</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unassigned Professionals */}
      {professionals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Profesionales Sin Capítulo</CardTitle>
            <CardDescription>
              Asigna estos profesionales a un capítulo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {professionals.map((professional) => (
                <div
                  key={professional.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{professional.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {professional.city}, {professional.state}
                    </p>
                  </div>
                  <Select
                    onValueChange={(value) => assignProfessionalToChapter(professional.id, value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Asignar capítulo" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
