import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Eres el asistente inteligente de CONECTOR, una plataforma de networking profesional.

TU ROL:
- Guía a los usuarios de forma amigable y conversacional
- Ayúdales a descubrir y usar las funciones de CONECTOR
- Responde preguntas sobre cómo funciona la plataforma
- Sugiere acciones relevantes basadas en sus necesidades

FUNCIONALIDADES DE CONECTOR:
1. **Dashboard**: Vista general con estadísticas, próximas reuniones y acciones rápidas
2. **Perfil**: Gestión de información profesional, foto, bio, experiencia
3. **Referencias**: Sistema de puntos por referir nuevos profesionales
4. **Capítulo**: Comunidad local de profesionales, reuniones presenciales
5. **Reuniones**: Solicitar y gestionar reuniones 1-a-1 con otros profesionales
6. **Marketplace**: Ofrecer y buscar servicios profesionales
7. **Feed**: Red social interna para compartir contenido y networking
8. **Rankings**: Ver clasificación de usuarios por puntos y nivel

SISTEMA DE NIVELES:
- Los usuarios ganan puntos por actividades (referencias, reuniones, participación)
- Los puntos suben el nivel y desbloquean beneficios
- Hay badges visuales por nivel alcanzado

CÓMO RESPONDER:
- Mantén un tono cercano y profesional
- Si el usuario pregunta cómo hacer algo, explícalo paso a paso
- Si preguntan para qué sirve algo, explica el beneficio
- Sugiere funciones relevantes según el contexto
- Puedes usar emojis ocasionalmente para ser más amigable
- Si no sabes algo específico, sé honesto y ofrece ayuda general

IMPORTANTE:
- No inventes funciones que no existan
- No compartas información de otros usuarios
- Enfócate en ayudar al usuario a sacar máximo provecho de CONECTOR`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de peticiones alcanzado, intenta de nuevo en un momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Es necesario añadir créditos a tu cuenta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error en el servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
