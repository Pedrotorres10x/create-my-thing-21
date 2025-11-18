import { supabase } from "@/integrations/supabase/client";

export interface ModerationResult {
  isAppropriate: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
  categories?: string[];
}

/**
 * Modera contenido de texto usando IA
 * @param text - Texto a moderar
 * @param context - Contexto del campo (ej: "nombre", "descripción")
 * @returns Resultado de moderación
 */
export async function moderateText(
  text: string,
  context?: string
): Promise<ModerationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        type: 'text',
        content: text,
        context: context
      }
    });

    if (error) {
      console.error('Moderation error:', error);
      // En caso de error, permitir por defecto pero loguear
      return {
        isAppropriate: true,
        reason: 'Error en moderación - contenido permitido por defecto'
      };
    }

    return data as ModerationResult;
  } catch (error) {
    console.error('Moderation exception:', error);
    return {
      isAppropriate: true,
      reason: 'Error en moderación - contenido permitido por defecto'
    };
  }
}

/**
 * Modera una imagen usando IA
 * @param imageData - Data URL o URL de la imagen
 * @param context - Contexto del campo (ej: "logo", "foto perfil")
 * @returns Resultado de moderación
 */
export async function moderateImage(
  imageData: string,
  context?: string
): Promise<ModerationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        type: 'image',
        content: imageData,
        context: context
      }
    });

    if (error) {
      console.error('Image moderation error:', error);
      return {
        isAppropriate: true,
        reason: 'Error en moderación - imagen permitida por defecto'
      };
    }

    return data as ModerationResult;
  } catch (error) {
    console.error('Image moderation exception:', error);
    return {
      isAppropriate: true,
      reason: 'Error en moderación - imagen permitida por defecto'
    };
  }
}

/**
 * Convierte un archivo a base64 para moderación
 * @param file - Archivo a convertir
 * @returns Promise con data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Valida que el contenido de texto sea apropiado antes de guardarlo
 * @param fields - Objeto con campos a validar
 * @returns Primer campo inapropiado encontrado o null si todo está bien
 */
export async function validateTextFields(
  fields: Record<string, string>
): Promise<{ field: string; result: ModerationResult } | null> {
  for (const [fieldName, value] of Object.entries(fields)) {
    if (!value || value.trim().length === 0) continue;
    
    const result = await moderateText(value, fieldName);
    
    if (!result.isAppropriate) {
      return { field: fieldName, result };
    }
  }
  
  return null;
}
