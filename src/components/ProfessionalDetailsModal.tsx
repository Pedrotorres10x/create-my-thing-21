import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Briefcase, 
  Calendar,
  Linkedin,
  Image as ImageIcon,
  Video
} from "lucide-react";

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

interface ProfessionalDetailsModalProps {
  professional: Professional | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfessionalDetailsModal({
  professional,
  open,
  onOpenChange,
}: ProfessionalDetailsModalProps) {
  if (!professional) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{professional.full_name}</DialogTitle>
            {getStatusBadge(professional.status)}
          </div>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Información Personal</TabsTrigger>
            <TabsTrigger value="multimedia">Multimedia</TabsTrigger>
            <TabsTrigger value="contact">Datos de Contacto</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="w-4 h-4" />
                  Nombre Completo
                </div>
                <p className="text-base">{professional.full_name}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  Empresa
                </div>
                <p className="text-base">{professional.company_name || professional.business_name}</p>
              </div>

              {professional.position && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    Posición
                  </div>
                  <p className="text-base">{professional.position}</p>
                </div>
              )}

              {professional.sector_catalog && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    Sector
                  </div>
                  <p className="text-base">{professional.sector_catalog.name}</p>
                </div>
              )}

              {professional.specializations && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    Especialización
                  </div>
                  <p className="text-base">{professional.specializations.name}</p>
                </div>
              )}

              {professional.years_experience && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Experiencia
                  </div>
                  <p className="text-base">{professional.years_experience} años</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Fecha de Registro
                </div>
                <p className="text-base">
                  {new Date(professional.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {professional.bio && (
              <div className="space-y-2 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground">Biografía</div>
                <p className="text-base leading-relaxed">{professional.bio}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="multimedia" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {professional.logo_url ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    Logo de la Empresa
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <img
                      src={professional.logo_url}
                      alt="Logo"
                      className="w-full h-48 object-contain"
                    />
                  </div>
                  <a
                    href={professional.logo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block"
                  >
                    Ver imagen completa
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    Logo de la Empresa
                  </div>
                  <div className="border rounded-lg p-8 bg-muted/20 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">No hay logo disponible</p>
                  </div>
                </div>
              )}

              {professional.photo_url ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    Foto Personal
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <img
                      src={professional.photo_url}
                      alt="Foto"
                      className="w-full h-48 object-contain"
                    />
                  </div>
                  <a
                    href={professional.photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block"
                  >
                    Ver imagen completa
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    Foto Personal
                  </div>
                  <div className="border rounded-lg p-8 bg-muted/20 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">No hay foto disponible</p>
                  </div>
                </div>
              )}
            </div>

            {professional.video_url ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Video className="w-4 h-4" />
                  Video de Presentación
                </div>
                <div className="border rounded-lg overflow-hidden bg-muted/20">
                  <video
                    src={professional.video_url}
                    controls
                    className="w-full"
                  />
                </div>
                <a
                  href={professional.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline block"
                >
                  Abrir video en nueva pestaña
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Video className="w-4 h-4" />
                  Video de Presentación
                </div>
                <div className="border rounded-lg p-8 bg-muted/20 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No hay video disponible</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="contact" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  Email
                </div>
                <a
                  href={`mailto:${professional.email}`}
                  className="text-base text-primary hover:underline"
                >
                  {professional.email}
                </a>
              </div>

              {professional.phone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    Teléfono
                  </div>
                  <a
                    href={`tel:${professional.phone}`}
                    className="text-base text-primary hover:underline"
                  >
                    {professional.phone}
                  </a>
                </div>
              )}

              {professional.website && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    Sitio Web
                  </div>
                  <a
                    href={professional.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-primary hover:underline"
                  >
                    {professional.website}
                  </a>
                </div>
              )}

              {professional.linkedin_url && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </div>
                  <a
                    href={professional.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-primary hover:underline"
                  >
                    Ver perfil de LinkedIn
                  </a>
                </div>
              )}
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="text-sm font-medium text-muted-foreground">Dirección</div>
              <div className="space-y-2">
                {professional.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                    <p className="text-base">{professional.address}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <p className="text-base">
                    {professional.city}, {professional.state}
                    {professional.country && `, ${professional.country}`}
                    {professional.postal_code && ` - ${professional.postal_code}`}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
