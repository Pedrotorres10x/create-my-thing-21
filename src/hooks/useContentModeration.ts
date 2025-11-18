import { useState } from "react";
import { moderateText, moderateImage, ModerationResult } from "@/lib/moderation";
import { toast } from "@/hooks/use-toast";

export function useContentModeration() {
  const [isModerating, setIsModerating] = useState(false);

  /**
   * Valida texto con moderación
   */
  const validateText = async (
    text: string,
    fieldName: string
  ): Promise<boolean> => {
    if (!text || text.trim().length === 0) return true;

    setIsModerating(true);
    try {
      const result = await moderateText(text, fieldName);

      if (!result.isAppropriate) {
        toast({
          title: `⚠️ Contenido inapropiado en ${fieldName}`,
          description: result.reason || "Por favor, mantén un tono profesional",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Validation error:', error);
      // En caso de error, permitir por defecto
      return true;
    } finally {
      setIsModerating(false);
    }
  };

  /**
   * Valida imagen con moderación
   */
  const validateImage = async (
    imageData: string,
    fieldName: string
  ): Promise<boolean> => {
    setIsModerating(true);
    try {
      const result = await moderateImage(imageData, fieldName);

      if (!result.isAppropriate) {
        toast({
          title: `⚠️ Imagen inapropiada`,
          description: result.reason || "La imagen no es apropiada para un perfil profesional",
          variant: "destructive",
        });
        return false;
      }

      if (result.severity === 'high') {
        console.warn('High severity content detected:', result);
      }

      return true;
    } catch (error) {
      console.error('Image validation error:', error);
      // En caso de error, permitir por defecto
      return true;
    } finally {
      setIsModerating(false);
    }
  };

  /**
   * Valida múltiples campos de texto
   */
  const validateFields = async (
    fields: Record<string, string>
  ): Promise<{ isValid: boolean; invalidField?: string }> => {
    for (const [fieldName, value] of Object.entries(fields)) {
      const isValid = await validateText(value, fieldName);
      if (!isValid) {
        return { isValid: false, invalidField: fieldName };
      }
    }
    return { isValid: true };
  };

  return {
    validateText,
    validateImage,
    validateFields,
    isModerating,
  };
}
