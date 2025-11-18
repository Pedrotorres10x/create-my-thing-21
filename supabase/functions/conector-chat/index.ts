import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, conversationId, professionalId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load user context and profile info
    let userContextStr = '';
    let profileInfo: any = null;
    
    if (professionalId) {
      // Get professional profile
      const { data: profile } = await supabase
        .from('professionals')
        .select('full_name, sector_id, specialization_id, total_points, status, city, state')
        .eq('id', professionalId)
        .single();
      
      profileInfo = profile;

      // Get or create user AI context
      const { data: contextData } = await supabase
        .from('user_ai_context')
        .select('context_data')
        .eq('professional_id', professionalId)
        .single();
      
      if (contextData?.context_data) {
        userContextStr = `\n\nCONTEXTO DEL USUARIO:\n${JSON.stringify(contextData.context_data, null, 2)}`;
      }

      // Get conversation history for better context
      if (conversationId) {
        const { data: historyData } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(10); // Last 10 messages
        
        if (historyData && historyData.length > 0) {
          userContextStr += `\n\nHISTORIAL RECIENTE DE CONVERSACIÓN:\n`;
          historyData.forEach((msg: any) => {
            userContextStr += `${msg.role}: ${msg.content.substring(0, 200)}\n`;
          });
        }
      }

      // Add profile info to context
      if (profileInfo) {
        userContextStr += `\n\nINFORMACIÓN DEL USUARIO:\n`;
        userContextStr += `- Nombre: ${profileInfo.full_name}\n`;
        userContextStr += `- Puntos totales: ${profileInfo.total_points}\n`;
        userContextStr += `- Estado: ${profileInfo.status}\n`;
        userContextStr += `- Ubicación: ${profileInfo.city}, ${profileInfo.state}\n`;
      }
    }

    const systemPrompt = `Eres el asistente inteligente de CONECTOR, una plataforma de networking profesional.

TU ROL:
- Eres un guía proactivo y amigable que ayuda a los usuarios a sacar el máximo provecho de CONECTOR
- Recuerdas conversaciones anteriores y el contexto del usuario para personalizar la experiencia
- Sugieres acciones relevantes basadas en su perfil y actividad
- Anticipas necesidades y ofreces ayuda antes de que pregunten
- Haces preguntas para entender mejor sus objetivos profesionales

FUNCIONALIDADES DE CONECTOR:
1. **Dashboard**: Vista general con estadísticas, próximas reuniones y acciones rápidas
2. **Perfil**: Gestión de información profesional, foto, bio, experiencia
3. **Referencias**: Sistema de puntos por referir nuevos profesionales (100 puntos por referido completado)
4. **Capítulo**: Comunidad local de profesionales, reuniones presenciales
5. **Reuniones**: Solicitar y gestionar reuniones 1-a-1 con otros profesionales
6. **Marketplace**: Ofrecer y buscar servicios profesionales
7. **Feed**: Red social interna para compartir contenido y networking
8. **Rankings**: Ver clasificación de usuarios por puntos y nivel
9. **Tutoriales**: Guías paso a paso para usar la plataforma

SISTEMA DE NIVELES:
- Los usuarios ganan puntos por actividades (referencias, reuniones, participación)
- Los puntos suben el nivel y desbloquean beneficios
- Hay badges visuales por nivel alcanzado

CÓMO GUIAR PROACTIVAMENTE:
- Si es usuario nuevo (pocos puntos), sugiere completar su perfil y unirse a un capítulo
- Si tiene perfil incompleto, recomienda añadir foto, bio, y experiencia
- Si no tiene reuniones agendadas, sugiere conectar con profesionales de su área
- Si no tiene referencias, explica el sistema de puntos y cómo ganar 100 puntos por referido
- Si está activo en la plataforma, sugiere crear ofertas en el marketplace o publicar en el feed
- Pregunta sobre sus objetivos profesionales para dar recomendaciones personalizadas

PERSONALIZACIÓN CON MEMORIA:
- Recuerda conversaciones anteriores y haz seguimiento de temas discutidos
- Si el usuario mencionó un objetivo, pregunta por su progreso
- Adapta tus sugerencias basándote en su sector y especialización
- Usa su nombre ocasionalmente para personalizar la experiencia
- Si detectas que está bloqueado en algo, ofrece ayuda específica

CÓMO RESPONDER:
- Mantén un tono cercano, profesional y proactivo
- Sé conversacional, no robótico
- Haz preguntas abiertas para entender mejor sus necesidades
- Da respuestas concisas pero completas
- Ofrece 1-2 sugerencias accionables al final de cada respuesta
- Usa emojis ocasionalmente para ser más amigable (pero con moderación)
- Si no sabes algo específico, sé honesto y ofrece alternativas

IMPORTANTE:
- No inventes funciones que no existan
- No compartas información de otros usuarios
- Basa tus sugerencias en el contexto real del usuario
- Actualiza tu comprensión del usuario con cada interacción${userContextStr}`;

    // Update user context after interaction to remember this conversation
    if (professionalId && messages.length > 0) {
      const lastUserMessage = messages[messages.length - 1];
      const updatedContext = {
        last_topic: lastUserMessage.content.substring(0, 200),
        interaction_count: (profileInfo?.total_points || 0) > 0 ? 'active' : 'new',
        timestamp: new Date().toISOString()
      };
      
      const { error: contextError } = await supabase
        .from('user_ai_context')
        .upsert({
          professional_id: professionalId,
          context_data: updatedContext,
          last_interaction: new Date().toISOString()
        });
      
      if (contextError) {
        console.log('Error updating context:', contextError);
      }
    }

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
