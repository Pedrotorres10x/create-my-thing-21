import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";

interface ModerationWarningProps {
  className?: string;
}

export function ModerationWarning({ className }: ModerationWarningProps) {
  return (
    <Alert className={className} variant="default">
      <Shield className="h-4 w-4" />
      <AlertTitle>Plataforma Profesional Moderada</AlertTitle>
      <AlertDescription className="text-sm space-y-2">
        <p>
          CONECTOR cuenta con un sistema automático de moderación de contenido con IA.
        </p>
        <div className="flex items-start gap-2 mt-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
          <div className="space-y-1">
            <p className="font-medium">Se rechazará automáticamente:</p>
            <ul className="text-xs list-disc list-inside space-y-0.5 ml-2">
              <li>Nombres falsos, de broma o inapropiados</li>
              <li>Imágenes o logos con contenido sexual, violento o grosero</li>
              <li>Vídeos con contenido inapropiado</li>
              <li>Lenguaje vulgar, obsceno o discriminatorio</li>
            </ul>
          </div>
        </div>
        <p className="text-xs mt-2 text-muted-foreground">
          Intentos repetidos de contenido inapropiado resultarán en bloqueo permanente del registro.
        </p>
      </AlertDescription>
    </Alert>
  );
}
