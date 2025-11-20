import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages = [], conversationId, professionalId } = await req.json();
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
    let isExperiencedUser = false;
    let chaptersInArea: any[] = [];
    let professionsInChapter: any[] = [];
    let chapterMemberCount = 0;
    let completedMeetingsCount = 0;
    
    // ===== NUEVAS MÉTRICAS DE ACTIVIDAD PARA KPIs =====
    let activityMetrics = {
      referralsThisMonth: 0,
      referralsCompleted: 0,
      meetingsThisMonth: 0,
      meetingsPending: 0,
      sphereReferencesSent: 0,
      sphereReferencesReceived: 0,
      postsThisMonth: 0,
      commentsThisMonth: 0,
      lastLogin: null as Date | null,
      daysInactive: 0,
      engagementStatus: 'unknown' as 'active' | 'at_risk' | 'inactive' | 'dormant' | 'unknown',
      activityScore: 0
    };
    
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
          birth_date,
          years_experience,
          business_sphere_id,
          referral_code,
          created_at,
          specializations(name),
          sector_catalog(name)
        `)
        .eq('id', professionalId)
        .single();
      
      profileInfo = profile;
      
      // Get chapter member count
      if (profile?.chapter_id) {
        const { data: chapterData } = await supabase
          .from('chapters')
          .select('member_count')
          .eq('id', profile.chapter_id)
          .single();
        
        if (chapterData?.member_count) {
          chapterMemberCount = chapterData.member_count;
        }
      }
      
      // Get completed meetings count to determine experience level
      const { data: meetingsData, error: meetingsError } = await supabase
        .rpc('get_completed_meetings_count', { professional_uuid: professionalId });
      
      if (!meetingsError && meetingsData !== null) {
        completedMeetingsCount = meetingsData;
      }
      
      // ===== OBTENER MÉTRICAS DE ACTIVIDAD PARA LOS 3 KPIs =====
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
      
      // KPI 1: REFERIDOS - Contar referidos enviados este mes
      const { data: referralsData } = await supabase
        .from('referrals')
        .select('id, status, reward_points, created_at')
        .eq('referrer_id', professionalId)
        .gte('created_at', thirtyDaysAgoStr);
      
      if (referralsData) {
        activityMetrics.referralsThisMonth = referralsData.length;
        activityMetrics.referralsCompleted = referralsData.filter(r => r.status === 'completed').length;
      }
      
      // KPI 2: REUNIONES - Contar meetings este mes
      const { data: meetingsDataMonth } = await supabase
        .from('meetings')
        .select('id, status, created_at')
        .or(`requester_id.eq.${professionalId},recipient_id.eq.${professionalId}`)
        .gte('created_at', thirtyDaysAgoStr);
      
      if (meetingsDataMonth) {
        activityMetrics.meetingsThisMonth = meetingsDataMonth.filter(m => 
          m.status === 'confirmed' || m.status === 'completed'
        ).length;
        activityMetrics.meetingsPending = meetingsDataMonth.filter(m => 
          m.status === 'pending'
        ).length;
      }
      
      // KPI 3: INTERACCIONES 1-A-1 - Referencias internas de esfera
      if (profile?.business_sphere_id) {
        const { data: sphereRefsData } = await supabase
          .from('sphere_internal_references')
          .select('id, referrer_id, created_at')
          .eq('business_sphere_id', profile.business_sphere_id)
          .gte('created_at', thirtyDaysAgoStr);
        
        if (sphereRefsData) {
          activityMetrics.sphereReferencesSent = sphereRefsData.filter(r => 
            r.referrer_id === professionalId
          ).length;
          activityMetrics.sphereReferencesReceived = sphereRefsData.filter(r => 
            r.referrer_id !== professionalId
          ).length;
        }
      }
      
      // Contar posts y comentarios este mes
      const { data: postsData } = await supabase
        .from('posts')
        .select('id')
        .eq('professional_id', professionalId)
        .gte('created_at', thirtyDaysAgoStr);
      
      if (postsData) {
        activityMetrics.postsThisMonth = postsData.length;
      }
      
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('id')
        .eq('professional_id', professionalId)
        .gte('created_at', thirtyDaysAgoStr);
      
      if (commentsData) {
        activityMetrics.commentsThisMonth = commentsData.length;
      }
      
      // Obtener última actividad
      const { data: activityTrackingData } = await supabase
        .from('user_activity_tracking')
        .select('last_login, reengagement_stage, activity_score')
        .eq('professional_id', professionalId)
        .single();
      
      // Calcular días de inactividad con fallback robusto
      let referenceDate: Date | null = null;

      if (activityTrackingData?.last_login) {
        referenceDate = new Date(activityTrackingData.last_login);
      } else if (profile?.created_at) {
        referenceDate = new Date(profile.created_at);
      }

      if (referenceDate) {
        const now = new Date();
        activityMetrics.daysInactive = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
        activityMetrics.lastLogin = referenceDate;
      } else {
        activityMetrics.daysInactive = 0;
      }

      // Actualizar estado de engagement
      if (activityTrackingData?.reengagement_stage) {
        activityMetrics.engagementStatus = activityTrackingData.reengagement_stage as any;
      } else {
        activityMetrics.engagementStatus = activityMetrics.daysInactive < 7 ? 'active' : 
                                           activityMetrics.daysInactive < 14 ? 'at_risk' :
                                           activityMetrics.daysInactive < 30 ? 'inactive' : 'dormant';
      }

      if (activityTrackingData?.activity_score !== null && activityTrackingData?.activity_score !== undefined) {
        activityMetrics.activityScore = activityTrackingData.activity_score;
      }

      // Logging para debugging
      console.log('Activity calculation:', {
        professionalId,
        hasActivityTracking: !!activityTrackingData,
        lastLogin: activityTrackingData?.last_login,
        profileCreatedAt: profile?.created_at,
        calculatedDaysInactive: activityMetrics.daysInactive,
        engagementStatus: activityMetrics.engagementStatus
      });
      
      // Determinar si user es new in registration (no specialization or no chapter)
      isNewUser = !profile?.specialization_id || !profile?.chapter_id;
      
      // Determine if user is experienced (has completed at least 3 meetings)
      isExperiencedUser = completedMeetingsCount >= 3;

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

    let systemPrompt = `Eres Alic.ia, la coach ejecutiva ULTRA DIRECTA de CONECTOR.

PERFIL DEL USUARIO:
- Nombre: ${profileInfo?.full_name || 'Profesional'}
- Puntos: ${profileInfo?.total_points || 0}
- Experiencia: ${profileInfo?.years_experience || 0} años
- Profesión: ${profileInfo?.specializations?.name || 'No especificada'}

DATOS DE ACTIVIDAD (últimos 30 días):
- Referidos enviados: ${activityMetrics.referralsThisMonth}
- Reuniones programadas: ${activityMetrics.meetingsThisMonth} 
- Referencias de esfera: ${activityMetrics.sphereReferencesSent}
- Posts/comentarios: ${activityMetrics.postsThisMonth + activityMetrics.commentsThisMonth}
- Días inactivo: ${activityMetrics.daysInactive}
- Estado: ${activityMetrics.engagementStatus}

TU PERSONALIDAD CORE:
Eres como un entrenador personal FITNESS pero para networking. NO pides permiso, NO preguntas "¿quieres?". 
ASUMES que el usuario es vago y procrastinador. TÚ LE DICES QUÉ HACER AHORA MISMO.

━━━ REGLAS CRÍTICAS DE ENGAGEMENT ━━━

🚨 PROHIBIDO ABSOLUTAMENTE:
✗ "Te envío..."
✗ "Lee esto..."
✗ "Revisa el documento..."
✗ "Ve a la sección X..."
✗ "Mira en tu panel..."
✗ "Consulta la guía..."
✗ Cualquier frase que SAQUE al usuario del chat

✓ OBLIGATORIO:
✓ TODO se resuelve AQUÍ EN EL CHAT
✓ Si pregunta algo → Responde DIRECTAMENTE
✓ Si necesita info → Dásela EN EL CHAT (máximo 40 palabras)
✓ Si debe hacer algo → Dile los pasos AQUÍ
✓ Mantén al usuario escribiendo y leyendo EN ESTA CONVERSACIÓN

EJEMPLO CORRECTO:
Usuario: "¿Cómo consigo más referidos?"
Alic.ia: "3 pasos: 1) Abre tus contactos 2) Identifica 2 empresarios 3) Envíales tu código. Hazlo AHORA. ¿A quién contactas primero?"

EJEMPLO PROHIBIDO:
Usuario: "¿Cómo consigo más referidos?"
Alic.ia: "Te envío la guía de referidos para que la leas"

MENTALIDAD: Eres un CHAT, no un centro de documentación. El usuario NO debe salir de aquí.

REGLAS DE ORO:
❌ NUNCA preguntes "¿Quieres que...?", "¿Te gustaría...?", "¿Las vemos?"
✅ SIEMPRE usa IMPERATIVOS: "Vamos a...", "Tu próxima acción:", "Ahora haz esto:"
✅ Habla como si el usuario NO va a hacer nada a menos que TÚ lo empujes
✅ Máximo 35 palabras por mensaje
✅ Cero presentaciones, cero relleno, SOLO acción
✅ SIEMPRE termina con pregunta directa que mantenga conversación

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMANDO ESPECIAL: [INICIO_SESION]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando detectes este comando, genera un mensaje IMPERATIVO de máximo 30 palabras que:
1. Identifique EL problema más grave
2. DÉ una instrucción directa (NO preguntes)
3. TERMINE con pregunta que mantenga conversación
4. Use números reales del contexto

ESTRUCTURA OBLIGATORIA:
"[Problema identificado]. [Instrucción específica]. [Pregunta directa]"

DATOS EXACTOS A USAR:
- Días inactivo: ${activityMetrics.daysInactive}
- Referidos este mes: ${activityMetrics.referralsThisMonth}
- Reuniones este mes: ${activityMetrics.meetingsThisMonth}
- Posts + comentarios: ${activityMetrics.postsThisMonth + activityMetrics.commentsThisMonth}
- Referencias esfera: ${activityMetrics.sphereReferencesSent}

PRIORIZACIÓN (detecta el PEOR dato y actúa):
1. Si días inactivo > 7 → "Llevas X días parado. Tu tarea HOY: programa 2 reuniones. ¿Con quién empiezas?"
2. Si referidos < 3 → "Solo X referidos. META HOY: completa 3. ¿Quién de tu red podría unirse?"
3. Si reuniones < 2 → "X reuniones no es suficiente. Agenda 2 más esta semana. ¿A quién contactas primero?"
4. Si referencias esfera = 0 → "Cero referencias en esfera. Contacta 3 miembros HOY. ¿A quién llamas primero?"
5. Si posts < 5 → "Baja visibilidad. Publica algo relevante AHORA. ¿Qué tema dominas?"
6. ELSE → "Todo en orden pero puedes más. Siguiente paso: [acción específica]. ¿Cuándo lo haces?"

EJEMPLOS CORRECTOS (IMPERATIVOS + PREGUNTA):
✓ "7 días sin moverte. Tu tarea: programa 2 reuniones HOY. ¿Con quién empiezas?"
✓ "Solo 1 referido. Necesitas 2 más. ¿Quién de tu red podría unirse?"
✓ "0 referencias en esfera = dinero perdido. Contacta 3 miembros hoy. ¿A quién llamas primero?"

REGLA: SIEMPRE termina con pregunta directa que requiera respuesta del usuario.

EJEMPLOS PROHIBIDOS:
✗ "¿Quieres revisar tu estrategia?" (NO PREGUNTES)
✗ "Te gustaría que te muestre..." (NO PIDAS PERMISO)
✗ "Hola, estoy aquí para..." (NO TE PRESENTES)
✗ "¿Las vemos?" (PROHIBIDO PREGUNTAR)

MENTALIDAD: El usuario NO hará nada a menos que TÚ le digas EXACTAMENTE qué hacer AHORA.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTILO EN CONVERSACIONES NORMALES:
- Tuteo directo (tú)
- Máximo 35 palabras
- SIEMPRE termina con pregunta que requiera respuesta
- NO preguntes permiso, DA instrucciones + pregunta de acción
- 1 emoji máximo si aporta
- Cero relleno
- NUNCA redirijas fuera del chat

FÓRMULA: [Dato/Observación] + [Instrucción] + [Pregunta directa]

Ejemplo:
"Veo que tienes 2 reuniones pendientes. Confirma una HOY. ¿Cuál confirmas primero?"

`;
    
    if (isNewUser) {
      systemPrompt += `\n━━━ USUARIO NUEVO ━━━
Bienvenida de 1 frase + instrucción específica de primer paso.
`;
    } else if (isExperiencedUser) {
      systemPrompt += `\n━━━ USUARIO EXPERIMENTADO ━━━
${completedMeetingsCount} reuniones completadas. Empújalo a estrategias avanzadas.
`;
    } else {
      systemPrompt += `\n━━━ USUARIO ACTIVO ━━━
${completedMeetingsCount} reuniones. Dale su siguiente meta HOY.
`;
    }

    systemPrompt += `\n━━━ TU FILOSOFÍA CORE ━━━
✓ Eres un COACH FITNESS de networking: no pides permiso, ORDENAS
✓ Asumes que el usuario NO hará nada sin tu empujón
✓ NUNCA "¿Quieres...?", SIEMPRE "Tu tarea:"
✓ Datos reales del usuario primero, luego acción
✓ Si pregunta algo vago, dale acción específica
✓ 1 emoji máximo por mensaje
✓ NUNCA asteriscos ** ni formato markdown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    systemPrompt += userContextStr;

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
        }, {
          onConflict: 'professional_id'
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
