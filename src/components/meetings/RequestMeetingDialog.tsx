import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRateLimiter } from "@/hooks/useRateLimiter";

interface Professional {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  company_name: string | null;
}

interface RequestMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const RequestMeetingDialog = ({ open, onOpenChange, onSuccess }: RequestMeetingDialogProps) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [myProfessionalId, setMyProfessionalId] = useState<string | null>(null);
  const { toast } = useToast();
  const { checkRateLimit } = useRateLimiter();

  const [formData, setFormData] = useState({
    recipient_id: "",
    meeting_date: undefined as Date | undefined,
    meeting_time: "",
    duration_minutes: "60",
    meeting_type: "in_person",
    location: "",
    meeting_link: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      loadProfessionals();
    }
  }, [open]);

  const loadProfessionals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myProf } = await supabase
        .from('professionals')
        .select('id, chapter_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (!myProf) return;

      setMyProfessionalId(myProf.id);

      // Get professionals from the same chapter
      const { data: chapterMembers } = await supabase
        .from('professionals')
        .select('id, full_name, photo_url, position, company_name')
        .eq('chapter_id', myProf.chapter_id)
        .eq('status', 'approved')
        .neq('id', myProf.id);

      if (chapterMembers) {
        setProfessionals(chapterMembers);
      }
    } catch (error) {
      console.error('Error loading professionals:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.recipient_id || !formData.meeting_date) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Rate limit check
      if (myProfessionalId) {
        const allowed = await checkRateLimit(myProfessionalId, 'meeting_request');
        if (!allowed) {
          setLoading(false);
          return;
        }
      }

      // Combine date and time
      // Combine date and time
      const meetingDateTime = new Date(formData.meeting_date);
      if (formData.meeting_time) {
        const [hours, minutes] = formData.meeting_time.split(':');
        meetingDateTime.setHours(parseInt(hours), parseInt(minutes));
      }

      const { error } = await supabase
        .from('meetings')
        .insert([{
          requester_id: myProfessionalId,
          recipient_id: formData.recipient_id,
          meeting_date: meetingDateTime.toISOString(),
          duration_minutes: parseInt(formData.duration_minutes),
          meeting_type: formData.meeting_type,
          location: formData.meeting_type === 'in_person' ? formData.location : null,
          meeting_link: formData.meeting_type === 'virtual' ? formData.meeting_link : null,
          notes: formData.notes || null,
        }]);

      if (error) throw error;

      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de reunión ha sido enviada correctamente",
      });

      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      recipient_id: "",
      meeting_date: undefined,
      meeting_time: "",
      duration_minutes: "60",
      meeting_type: "in_person",
      location: "",
      meeting_link: "",
      notes: "",
    });
  };

  const selectedProfessional = professionals.find(p => p.id === formData.recipient_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Reunión 1-a-1</DialogTitle>
          <DialogDescription>
            Envía una solicitud de reunión a un miembro de tu capítulo
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Con quién quieres reunirte *</Label>
            <Select 
              value={formData.recipient_id} 
              onValueChange={(value) => setFormData({ ...formData, recipient_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un profesional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    <div className="flex items-center gap-2">
                      <span>{prof.full_name}</span>
                      {prof.position && (
                        <span className="text-xs text-muted-foreground">
                          - {prof.position}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedProfessional && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mt-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedProfessional.photo_url || undefined} />
                  <AvatarFallback>
                    {selectedProfessional.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selectedProfessional.full_name}</p>
                  {selectedProfessional.position && (
                    <p className="text-xs text-muted-foreground">{selectedProfessional.position}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.meeting_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.meeting_date ? (
                      format(formData.meeting_date, "PPP", { locale: es })
                    ) : (
                      "Selecciona una fecha"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.meeting_date}
                    onSelect={(date) => setFormData({ ...formData, meeting_date: date })}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <Input
                id="time"
                type="time"
                value={formData.meeting_time}
                onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duración</Label>
            <Select 
              value={formData.duration_minutes} 
              onValueChange={(value) => setFormData({ ...formData, duration_minutes: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1.5 horas</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de reunión</Label>
            <Select 
              value={formData.meeting_type} 
              onValueChange={(value) => setFormData({ ...formData, meeting_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">Presencial</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.meeting_type === 'in_person' ? (
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ej: Café Central, Calle Mayor 123"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="meeting_link">Enlace de reunión virtual</Label>
              <Input
                id="meeting_link"
                type="url"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas / Agenda (opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Describe brevemente el propósito de la reunión..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Solicitud"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
