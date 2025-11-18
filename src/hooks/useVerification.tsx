import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface VerificationStatus {
  emailVerified: boolean;
  nifVerified: boolean;
  businessVerified: boolean;
}

export function useVerification(professionalId: string) {
  const [verifying, setVerifying] = useState(false);

  const checkVerificationStatus = async (): Promise<VerificationStatus> => {
    // En una implementación real, esto vendría de la base de datos
    // Por ahora, asumimos que el email está verificado si el usuario existe
    return {
      emailVerified: true,
      nifVerified: false, // Esto se implementaría con un servicio externo
      businessVerified: false, // Esto requeriría validación manual o con API de AEAT
    };
  };

  const verifyNIF = async (nif: string): Promise<boolean> => {
    setVerifying(true);
    try {
      // Validación básica del formato NIF/CIF español
      const { data, error } = await supabase.rpc("validate_spanish_nif_cif", {
        nif_cif: nif.toUpperCase().trim(),
      });

      if (error) throw error;

      if (!data) {
        toast({
          title: "NIF/CIF inválido",
          description: "El formato del NIF/CIF no es correcto",
          variant: "destructive",
        });
        return false;
      }

      // Aquí se integraría con un servicio externo de verificación de identidad
      // Por ahora solo validamos el formato
      toast({
        title: "✅ Formato válido",
        description: "El NIF/CIF tiene un formato correcto",
      });

      return true;
    } catch (error) {
      console.error("Error verifying NIF:", error);
      toast({
        title: "Error",
        description: "No se pudo verificar el NIF/CIF",
        variant: "destructive",
      });
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const requestBusinessVerification = async () => {
    setVerifying(true);
    try {
      // En una implementación real, esto enviaría documentos para revisión manual
      toast({
        title: "📄 Solicitud enviada",
        description: "Tu solicitud de verificación de empresa está en revisión. Te notificaremos cuando esté completa.",
      });

      return true;
    } catch (error) {
      console.error("Error requesting verification:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud de verificación",
        variant: "destructive",
      });
      return false;
    } finally {
      setVerifying(false);
    }
  };

  return {
    verifying,
    checkVerificationStatus,
    verifyNIF,
    requestBusinessVerification,
  };
}
