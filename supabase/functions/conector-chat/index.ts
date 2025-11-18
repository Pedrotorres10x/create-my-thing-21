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
    let isNewUser = false;
    let chaptersInArea: any[] = [];
    let professionsInChapter: any[] = [];
    
    if (professionalId) {
      // Get professional profile with chapter and specialization info
      const { data: profile } = await supabase
        .from('professionals')
        .select(`
          full_name, 
          sector_id, 
          specialization_id, 
          total_points, 
          status, 
          city, 
          state,
          chapter_id,
          specializations(name),
          sector_catalog(name)
        `)
        .eq('id', professionalId)
        .single();
      
      profileInfo = profile;
      
      // Determine if user is new (no specialization or no chapter)
      isNewUser = !profile?.specialization_id || !profile?.chapter_id;

      // If new user, get chapters in their area
      if (isNewUser && profile?.city && profile?.state) {
        const { data: chapters } = await supabase
          .from('chapters')
          .select('id, name, city, state, member_count')
          .eq('city', profile.city)
          .eq('state', profile.state);
        
        if (chapters) {
          chaptersInArea = chapters;
        }
      }

      // If user has a chapter, get professions already in that chapter
      if (profile?.chapter_id) {
        const { data: professionals } = await supabase
          .from('professionals')
          .select(`
            specialization_id,
            specializations(name)
          `)
          .eq('chapter_id', profile.chapter_id)
          .eq('status', 'approved')
          .neq('id', professionalId);
        
        if (professionals) {
          professionsInChapter = professionals;
        }
      }

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
          .limit(10);
        
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
        
        if (isNewUser) {
          userContextStr += `- USUARIO NUEVO: Necesita completar registro\n`;
          userContextStr += `- Tiene especialización: ${!!profileInfo.specialization_id}\n`;
          userContextStr += `- Tiene capítulo: ${!!profileInfo.chapter_id}\n`;
        }
        
        if (profileInfo.specialization_id) {
          userContextStr += `- Profesión: ${profileInfo.specializations?.name || 'No especificada'}\n`;
        }
        
        if (profileInfo.chapter_id) {
          userContextStr += `- Capítulo asignado: Sí\n`;
        }

        if (chaptersInArea.length > 0) {
          userContextStr += `\nCAPÍTULOS DISPONIBLES EN ${profileInfo.city}, ${profileInfo.state}:\n`;
          chaptersInArea.forEach((ch: any) => {
            userContextStr += `- ${ch.name} (${ch.member_count} miembros)\n`;
          });
        }

        if (professionsInChapter.length > 0) {
          userContextStr += `\nPROFESIONES YA OCUPADAS EN SU CAPÍTULO:\n`;
          professionsInChapter.forEach((prof: any) => {
            userContextStr += `- ${prof.specializations?.name}\n`;
          });
        }
      }
    }

    const systemPrompt = `Eres el asistente inteligente de CONECTOR, una plataforma de networking profesional.

TU ROL:
- Eres un guía proactivo y amigable que ayuda a los usuarios a sacar el máximo provecho de CONECTOR
- Recuerdas conversaciones anteriores y el contexto del usuario para personalizar la experiencia
- Sugieres acciones relevantes basadas en su perfil y actividad
- Guías a nuevos usuarios paso a paso en su proceso de registro
- Anticipas necesidades y ofreces ayuda antes de que pregunten
- Haces preguntas para entender mejor sus objetivos profesionales

${isNewUser ? `
⚠️ ESTE ES UN USUARIO NUEVO - PRIORIDAD MÁXIMA: COMPLETAR REGISTRO

FLUJO OBLIGATORIO PARA NUEVOS USUARIOS:

1. **Bienvenida y tipo de registro:**
   - Dar bienvenida cálida y explicar brevemente CONECTOR
   - PREGUNTAR: ¿Te registras como AUTÓNOMO o como EMPRESA?
   - Explicar diferencia:
     * Autónomo: Profesional independiente
     * Empresa: Organización con persona de contacto

2. **Definir capítulo** (paso crítico):
   ${chaptersInArea.length > 0 ? `
   - Hay ${chaptersInArea.length} capítulo(s) en ${profileInfo?.city}, ${profileInfo?.state}:
     ${chaptersInArea.map((ch: any) => `${ch.name} (${ch.member_count} miembros)`).join(', ')}
   - Preguntar si quiere unirse a uno existente o crear uno nuevo
   - Explicar: comunidad local que se reúne regularmente para networking
   ` : `
   - No hay capítulos en ${profileInfo?.city}, ${profileInfo?.state}
   - Sugerir crear nuevo capítulo (beneficios de ser fundador)
   - Explicar: comunidad local para networking presencial
   `}

3. **Datos profesionales y validación:**
   - Sector/industria
   - Profesión/especialización ESPECÍFICA
   - CRÍTICO: Explicar exclusividad (1 profesión por capítulo)
   ${professionsInChapter.length > 0 ? `
   
   ⚠️ PROFESIONES YA OCUPADAS:
   ${professionsInChapter.map((p: any) => `- ${p.specializations?.name}`).join('\n   ')}
   
   - Si menciona profesión ocupada, RECHAZAR amablemente
   - Sugerir alternativas relacionadas
   - Ejemplo: "Contador" ocupado → sugerir "Asesor Fiscal" o "Auditor"
   ` : `
   - Capítulo sin profesiones ocupadas
   - Enfatizar importancia de ser específico
   `}

4. **DATOS OBLIGATORIOS** (pedir uno por uno):

   ${profileInfo?.business_name ? 'EMPRESA:' : 'AUTÓNOMO O EMPRESA:'}
   
   A. **Datos básicos obligatorios:**
   - Nombre completo (persona física o de contacto)
   - NIF/CIF (validar formato español: 8 dígitos + letra o letra + 7 dígitos + letra)
   - Dirección completa (calle, número, código postal, ciudad, provincia)
   - Teléfono de contacto
   - Email (ya tienen el de registro)
   
   B. **Si es EMPRESA (adicional):**
   - Nombre de la empresa/razón social
   - CIF de la empresa (diferente al NIF personal)
   - Dirección fiscal de la empresa
   - Nombre y apellidos de persona de contacto
   - Cargo de la persona de contacto
   - Teléfono directo de contacto
   
   C. **Años de experiencia:**
   - En su profesión/sector (obligatorio)

5. **DATOS OPCIONALES** (ofrecer pero no insistir):
   
   - Logo (imagen):
     * Para autónomos: foto profesional
     * Para empresas: logotipo corporativo
     * Formatos: JPG, PNG, máximo 5MB
   
   - Descripción del negocio/servicios:
     * Breve resumen de qué ofrece (máximo 500 caracteres)
     * Propuesta de valor única
   
   - Vídeo de presentación:
     * ⚠️ MÁXIMO 30 SEGUNDOS
     * Presentación profesional personal o de la empresa
     * Formatos: MP4, MOV
     * Mencionar que es muy recomendable para destacar

6. **Confirmación y siguientes pasos:**
   - Resumen completo de datos ingresados
   - Confirmar: Tipo (autónomo/empresa) + Capítulo + Profesión
   - Explicar proceso de aprobación administrativa
   - Mencionar notificación por email
   - Sugerir mientras tanto: explorar plataforma, ver tutoriales

REGLAS ESTRICTAS:
- NO avances sin tipo de registro (autónomo/empresa)
- NO avances sin capítulo definido
- NO permitas profesiones duplicadas
- NO pidas todos los datos juntos, hazlo PASO A PASO
- Valida formato NIF/CIF español
- Si es empresa, SIEMPRE pide datos de contacto además de empresa
- Para vídeo, ENFATIZAR límite de 30 segundos
- Sé amigable pero firme con validaciones
- Si algo no es válido, explica por qué y pide corrección

⚠️ ADVERTENCIAS IMPORTANTES AL INICIO:
- Menciona que CONECTOR es una plataforma profesional seria
- Advierte que hay sistema automático de moderación de contenido
- Explica que contenido inapropiado será rechazado automáticamente:
  * Nombres falsos, de broma o groseros
  * Imágenes o logos inapropiados o sexuales
  * Vídeos con contenido inapropiado
  * Lenguaje vulgar u obsceno
- Indica que intentos de "bromear" resultarán en bloqueo de registro
- Mantén tono serio pero amigable sobre estas reglas
` : ''}

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

    // Moderate user input before processing (for new users providing registration data)
    if (professionalId && messages.length > 0 && isNewUser) {
      const lastUserMessage = messages[messages.length - 1];
      const userContent = lastUserMessage.content;
      
      // Check if message contains potential registration data that needs moderation
      if (userContent.length > 20) { // Only moderate substantial messages
        try {
          const moderationResponse = await fetch(`${supabaseUrl}/functions/v1/moderate-content`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'text',
              content: userContent,
              context: 'user_registration_input'
            })
          });

          if (moderationResponse.ok) {
            const moderationResult = await moderationResponse.json();
            
            if (!moderationResult.isAppropriate) {
              console.warn('Inappropriate content detected:', moderationResult);
              
              // Return warning message to user
              return new Response(JSON.stringify({ 
                error: `⚠️ Contenido inapropiado detectado: ${moderationResult.reason}. Por favor, mantén un tono profesional.`,
                moderation: moderationResult 
              }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        } catch (moderationError) {
          console.error('Moderation check failed:', moderationError);
          // Continue without moderation if service fails
        }
      }
    }

    // Update user context after interaction
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
