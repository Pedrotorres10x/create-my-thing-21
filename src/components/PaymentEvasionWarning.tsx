import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PaymentEvasionWarning() {
  return (
    <Alert variant="destructive" className="border-red-500/50 bg-red-500/5">
      <ShieldAlert className="h-5 w-5" />
      <AlertTitle className="font-bold text-lg">
        ⚠️ Advertencia: Pagos externos prohibidos
      </AlertTitle>
      <AlertDescription className="space-y-3 mt-2">
        <p className="font-medium">
          Todos los pagos deben realizarse exclusivamente a través de la plataforma.
        </p>
        <div className="bg-red-500/10 p-3 rounded-md border border-red-500/20">
          <p className="text-sm font-semibold mb-2">🚫 Está PROHIBIDO:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Solicitar o realizar pagos directos, transferencias o efectivo</li>
            <li>Compartir números de cuenta bancaria, Bizum, PayPal</li>
            <li>Acordar pagos "fuera de la app" o "sin comisión"</li>
            <li>Cualquier intento de evadir las comisiones de la plataforma</li>
          </ul>
        </div>
        <div className="flex items-start gap-2 bg-red-500/10 p-3 rounded-md border border-red-500/20">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">
            Consecuencias: <span className="text-red-600">Expulsión inmediata y permanente</span> de la plataforma.
            Monitoreamos todas las comunicaciones con IA.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
