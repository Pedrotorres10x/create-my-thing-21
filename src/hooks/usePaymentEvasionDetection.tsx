import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DetectionResult {
  isHighRisk: boolean;
  riskScore: number;
  detectedPatterns: string[];
  reasoning: string;
  suggestedAction: 'none' | 'warn' | 'flag' | 'block';
}

export function usePaymentEvasionDetection() {
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeContent = async (
    text: string,
    context: 'offer_description' | 'contact_message' | 'direct_message',
    professionalId: string,
    contextId?: string
  ): Promise<DetectionResult | null> => {
    if (!text || text.trim().length === 0) {
      return null;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-payment-evasion', {
        body: {
          text,
          context,
          professionalId,
          contextId,
        },
      });

      if (error) {
        console.error('Error analyzing content:', error);
        return null;
      }

      const result = data as DetectionResult;

      // Mostrar advertencia al usuario si es alto riesgo
      if (result.isHighRisk && result.riskScore >= 50) {
        const severityEmoji = result.riskScore > 80 ? '🚨' : '⚠️';
        
        toast({
          title: `${severityEmoji} Contenido sospechoso detectado`,
          description: result.reasoning,
          variant: result.riskScore > 80 ? 'destructive' : 'default',
          duration: 10000,
        });

        // Si es muy alto riesgo, mostrar advertencia adicional
        if (result.riskScore > 80) {
          toast({
            title: "⚠️ Advertencia importante",
            description: "Todos los pagos deben realizarse a través de la plataforma. Los pagos externos son causa de expulsión inmediata.",
            variant: "destructive",
            duration: 15000,
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Error in payment evasion detection:', error);
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  return {
    analyzing,
    analyzeContent,
  };
}
