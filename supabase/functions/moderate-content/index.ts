import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ModerationRequest {
  type: 'text' | 'image';
  content: string; // For text: the text to check. For image: base64 or URL
  context?: string; // Additional context like field name
  userId?: string; // User ID for violation tracking
  professionalId?: string; // Professional ID for violation tracking
}

interface ModerationResult {
  isAppropriate: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
  categories?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, context, userId, professionalId }: ModerationRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for logging violations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let moderationResult: ModerationResult;

    if (type === 'text') {
      moderationResult = await moderateText(content, context, LOVABLE_API_KEY);
    } else if (type === 'image') {
      moderationResult = await moderateImage(content, context, LOVABLE_API_KEY);
    } else {
      throw new Error('Invalid moderation type');
    }

    // Log violation if content is inappropriate
    if (!moderationResult.isAppropriate && (userId || professionalId)) {
      try {
        await supabase
          .from('moderation_violations')
          .insert({
            user_id: userId,
            professional_id: professionalId,
            violation_type: type,
            content_context: context,
            severity: moderationResult.severity || 'medium',
            reason: moderationResult.reason || 'Contenido inapropiado detectado',
            categories: moderationResult.categories || []
          });
        
        console.log('Violation logged:', {
          type,
          context,
          severity: moderationResult.severity
        });
      } catch (logError) {
        console.error('Error logging violation:', logError);
        // Continue even if logging fails
      }
    }

    return new Response(JSON.stringify(moderationResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error desconocido",
        isAppropriate: false,
        reason: "Error en el sistema de moderación"
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function moderateText(
  text: string, 
  context: string | undefined, 
  apiKey: string
): Promise<ModerationResult> {
  const systemPrompt = `Eres un moderador de contenido para CONECTOR, una plataforma profesional de networking.

TU TAREA: Analizar si el siguiente texto es apropiado para un entorno profesional.

DETECTAR Y RECHAZAR:
1. **Contenido sexual o pornográfico** (explícito o implícito)
2. **Lenguaje grosero, vulgar o obsceno**
3. **Nombres claramente de broma o burla** (ej: "Pepito Pérez", "Juan Sin Miedo", "Fulanito de Tal")
4. **Insultos, odio o discriminación** (racismo, sexismo, homofobia, etc.)
5. **Violencia o amenazas**
6. **Spam o publicidad engañosa**
7. **Nombres inventados o ficticios** que claramente no son reales
8. **Contenido que falta al respeto** a la seriedad de una plataforma profesional

CONTEXTO PROFESIONAL:
- Esta es una red de profesionales serios (abogados, contadores, empresarios, etc.)
- Los nombres deben ser reales y profesionales
- Las descripciones deben ser apropiadas para networking de negocios
- Rechaza cualquier intento de bromear o no tomarse en serio el registro

Responde SOLO con un JSON válido:
{
  "isAppropriate": boolean,
  "reason": "explicación clara del problema (si no es apropiado)",
  "severity": "low" | "medium" | "high",
  "categories": ["lista de categorías de problemas detectados"]
}

Si el contenido es completamente apropiado, reason debe ser una string vacía.`;

  const contextInfo = context ? `\n\nCampo: ${context}` : '';
  const userPrompt = `Analiza este contenido:${contextInfo}\n\n"${text}"`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`AI moderation failed: ${response.status}`);
  }

  const data = await response.json();
  const resultText = data.choices?.[0]?.message?.content;
  
  if (!resultText) {
    throw new Error("No moderation result from AI");
  }

  return JSON.parse(resultText);
}

async function moderateImage(
  imageUrl: string, 
  context: string | undefined, 
  apiKey: string
): Promise<ModerationResult> {
  const systemPrompt = `Eres un moderador de contenido visual para CONECTOR, una plataforma profesional de networking.

TU TAREA: Analizar si esta imagen es apropiada para un logo/foto de perfil profesional.

DETECTAR Y RECHAZAR:
1. **Contenido sexual, desnudos o pornográfico**
2. **Imágenes groseras, vulgares u obscenas**
3. **Símbolos de odio, discriminación o violencia**
4. **Imágenes claramente de broma o burla** (memes, caricaturas inapropiadas)
5. **Contenido violento o perturbador**
6. **Logos falsos o robados de marcas conocidas**
7. **Imágenes que no son logos ni fotos profesionales** (paisajes, animales, objetos random)

PERMITIR:
- Logos profesionales de empresas
- Fotos profesionales de personas
- Diseños corporativos serios
- Fotografías de perfil apropiadas

Responde SOLO con un JSON válido:
{
  "isAppropriate": boolean,
  "reason": "explicación clara del problema (si no es apropiado)",
  "severity": "low" | "medium" | "high",
  "categories": ["lista de categorías de problemas detectados"]
}`;

  const contextInfo = context ? `\nCampo: ${context}` : '';
  const userPrompt = `Analiza esta imagen de logo/perfil profesional:${contextInfo}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { 
          role: "user", 
          content: [
            { type: "text", text: systemPrompt + "\n\n" + userPrompt },
            { 
              type: "image_url", 
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`AI image moderation failed: ${response.status}`);
  }

  const data = await response.json();
  const resultText = data.choices?.[0]?.message?.content;
  
  if (!resultText) {
    throw new Error("No moderation result from AI");
  }

  return JSON.parse(resultText);
}
