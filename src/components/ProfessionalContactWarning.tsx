import { AlertCircle, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ProfessionalContactWarning() {
  return (
    <Alert variant="default" className="border-primary/20 bg-primary/5">
      <Shield className="h-4 w-4 text-primary" />
      <AlertTitle className="text-primary font-semibold">
        Comunidad Profesional
      </AlertTitle>
      <AlertDescription className="text-sm space-y-2">
        <p>
          Esta plataforma es para generar negocio entre profesionales. Te recordamos:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Mantén un tono respetuoso y profesional en todo momento</li>
          <li>No hagas spam ni contactes de forma masiva sin contexto</li>
          <li>Los reportes de comportamiento inapropiado son revisados</li>
          <li>El abuso puede resultar en pérdida de puntos o suspensión</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
