import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedId: string;
  reportedName: string;
  context?: string;
  contextId?: string;
  reporterId: string;
}

const reportTypes = [
  { value: "spam", label: "Spam o publicidad excesiva" },
  { value: "inappropriate_contact", label: "Contacto inapropiado" },
  { value: "fraud", label: "Fraude o estafa" },
  { value: "harassment", label: "Acoso" },
  { value: "fake_profile", label: "Perfil falso" },
  { value: "other", label: "Otro" },
];

export function ReportUserDialog({
  open,
  onOpenChange,
  reportedId,
  reportedName,
  context,
  contextId,
  reporterId,
}: ReportUserDialogProps) {
  const [reportType, setReportType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reportType || !description.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor selecciona un tipo de reporte y describe la situación.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("user_reports").insert({
        reporter_id: reporterId,
        reported_id: reportedId,
        report_type: reportType,
        context,
        context_id: contextId,
        description: description.trim(),
      });

      if (error) throw error;

      toast({
        title: "✅ Reporte enviado",
        description: "Gracias por ayudarnos a mantener la comunidad profesional. Revisaremos tu reporte.",
      });

      // Resetear formulario y cerrar
      setReportType("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el reporte. Por favor intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reportar a {reportedName}</DialogTitle>
          <DialogDescription>
            Ayúdanos a mantener una comunidad profesional reportando comportamientos inapropiados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg border border-border flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Los reportes son revisados por nuestro equipo. El abuso de este sistema puede resultar en penalizaciones.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-type">Tipo de reporte *</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Selecciona el tipo de problema" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              placeholder="Describe en detalle qué sucedió. Incluye capturas de pantalla si es posible (súbelas por separado)."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !reportType || !description.trim()}>
            {loading ? "Enviando..." : "Enviar reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
