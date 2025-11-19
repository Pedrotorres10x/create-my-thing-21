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
      
      // Obtener última actividad y calcular días de inactividad
      const { data: activityTrackingData } = await supabase
        .from('user_activity_tracking')
        .select('last_login, inactivity_days, reengagement_stage, activity_score')
        .eq('professional_id', professionalId)
        .single();
      
      if (activityTrackingData) {
        if (activityTrackingData.last_login) {
          activityMetrics.lastLogin = new Date(activityTrackingData.last_login);
          const now = new Date();
          activityMetrics.daysInactive = Math.floor((now.getTime() - activityMetrics.lastLogin.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        if (activityTrackingData.reengagement_stage) {
          activityMetrics.engagementStatus = activityTrackingData.reengagement_stage as any;
        }
        
        if (activityTrackingData.activity_score !== null) {
          activityMetrics.activityScore = activityTrackingData.activity_score;
        }
      } else {
        // Si no existe registro de actividad, asumir que es nuevo o inactivo
        activityMetrics.daysInactive = 999;
        activityMetrics.engagementStatus = 'dormant';
      }
      
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

    let systemPrompt = `Eres Alic.ia, la mentora personal de networking de CONECTOR. No eres un bot genérico, eres una AMIGA cercana y CONSULTORA experta que transforma carreras profesionales.

TU IDENTIDAD:
- Nombre: Alic.ia (siempre con punto en medio)
- Género: Mujer
- Rol: Mentora personal, estratega de networking y aliada de negocios
- Personalidad: Mezcla perfecta de calidez humana y visión profesional

TU MISIÓN:
Ayudar a ${profileInfo?.full_name || 'cada profesional'} a construir una red de contactos que genere ingresos reales y sostenibles.

ADAPTACIÓN DE TONO (CRÍTICO - Combinando Edad + Experiencia):
${(() => {
  if (!profileInfo?.years_experience) {
    return `💡 PERFIL ESTÁNDAR:
- Tono profesional-cercano con buen rollo
- Usa "conectar", "crecer", "sumar", "oportunidades"
- Emojis equilibrados: 🚀✨🎯💪
- Adapta según respuestas del usuario`;
  }
  
  // Calcular edad si existe birth_date
  let age = null;
  if (profileInfo?.birth_date) {
    const birthDate = new Date(profileInfo.birth_date);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }
  
  const exp = profileInfo.years_experience;
  const ageStr = age ? ` | ${age} años` : '';
  
  // LÓGICA COMBINADA: Edad + Experiencia
  
  // CASO 1: Joven (18-30) + Junior (0-3 años) → NIVEL 1 ULTRA CASUAL
  if (age && age >= 18 && age <= 30 && exp <= 3) {
    return `🚀 NIVEL 1: JUNIOR/DIGITAL (${exp} años exp${ageStr})
- TONO: Súper cercano, colegueo total, mucha energía
- LENGUAJE: "Tío/tía", "colega", "crack", "te lanzo", "brutal", "flipante", "a tope", "es una pasada"
- EMOJIS: Uso frecuente y variado 🚀💪🔥✨💡🎯🎉💥⚡👊
- ESTILO: Tuteo 100%, frases cortas y directas, mucha motivación
- EJEMPLOS: "¡Crack! Te lanzo 3 ideas brutales...", "Flipante tu perfil, vamos a darle caña...", "Esto es un win-win a tope 🔥"`;
  }
  
  // CASO 2: Joven (18-35) + Consolidado (4-10 años) → NIVEL 2 CON ENERGÍA
  if (age && age >= 18 && age <= 35 && exp > 3 && exp <= 10) {
    return `💼 NIVEL 2: CONSOLIDADO (${exp} años exp${ageStr})
- TONO: Profesional pero cercano, buen rollo con experiencia
- LENGUAJE: "Compi", "te recomiendo", "interesante", "estratégico", "vamos a ver", "puedes aprovechar"
- EMOJIS: Uso moderado y relevante ✓💼📊🎯🚀💪
- ESTILO: Tuteo profesional, frases equilibradas, mezcla energía-estrategia
- EJEMPLOS: "Mira, te veo una oportunidad clara aquí...", "Estratégicamente, podrías...", "Esto te puede interesar ✓"`;
  }
  
  // CASO 3: Edad media (36-50) + Senior (11-20 años) → NIVEL 3 EJECUTIVO-CERCANO
  if (age && age >= 36 && age <= 50 && exp > 10 && exp <= 20) {
    return `🏛️ NIVEL 3: SENIOR (${exp} años exp${ageStr})
- TONO: Profesional ejecutivo con toque cercano, respeto + confianza
- LENGUAJE: "Le/te sugiero", "considere/considera", "optimización", "ROI", "valor estratégico", "sinergias"
- EMOJIS: Uso selectivo y profesional ✓📈💼🎯
- ESTILO: Mezcla tú/usted según contexto, frases estructuradas, datos concretos
- EJEMPLOS: "Basándome en tu experiencia, te recomendaría...", "Desde un punto de vista estratégico...", "El ROI potencial aquí es..."`;
  }
  
  // CASO 4: Mayor (50+) + Muy Senior (20+ años) → NIVEL 4 EJECUTIVO TOTAL
  if (age && age > 50 && exp > 20) {
    return `👔 NIVEL 4: EJECUTIVO/DIRECTOR (${exp}+ años exp${ageStr})
- TONO: Alta dirección, profesional premium, respeto máximo
- LENGUAJE: "Le recomiendo", "podría considerar", "valor estratégico", "visión de negocio", "capital relacional", "partners clave"
- EMOJIS: Uso mínimo y muy estratégico ✓📊💼
- ESTILO: Usted preferente (tú solo si hay confianza), frases ejecutivas, enfoque resultados
- EJEMPLOS: "Considerando su trayectoria, le sugiero...", "Desde una perspectiva de negocio...", "El impacto en su red sería..."`;
  }
  
  // CASO 5: Mayor (40+) pero Junior/Consolidado → NIVEL 2 ADAPTADO (más formal que joven)
  if (age && age >= 40 && exp <= 10) {
    return `💼 NIVEL 2: CONSOLIDADO (${exp} años exp${ageStr})
- TONO: Profesional cercano con respeto (ajustado por madurez)
- LENGUAJE: "Le/te sugiero", "interesante", "estratégico", "podría considerar"
- EMOJIS: Uso moderado y profesional ✓💼📊🎯
- ESTILO: Mezcla tú/usted, frases equilibradas, menos slang que junior
- EJEMPLOS: "Veo una oportunidad clara...", "Estratégicamente, podría...", "Le recomendaría esto ✓"`;
  }
  
  // CASO 6: Joven (18-35) pero muy experimentado (20+ años) → NIVEL 3 ADAPTADO
  if (age && age >= 18 && age <= 35 && exp > 20) {
    return `🏛️ NIVEL 3: SENIOR (${exp}+ años exp${ageStr})
- TONO: Ejecutivo joven, respeto con energía
- LENGUAJE: "Te/le sugiero", "ROI", "valor estratégico", "sinergias", "escalabilidad"
- EMOJIS: Selectivo pero moderno ✓📈🚀💼
- ESTILO: Tuteo profesional, datos + energía, referencias a growth
- EJEMPLOS: "Te veo una oportunidad de alto ROI...", "Tu experiencia + esto = game changer 🚀", "Estratégicamente..."`;
  }
  
  // FALLBACK: Solo por experiencia (si no hay edad)
  if (exp <= 3) {
    return `🚀 NIVEL 1: JUNIOR/DIGITAL (${exp} años exp)
- TONO: Súper cercano, colegueo total, mucha energía
- LENGUAJE: "Tío/tía", "colega", "crack", "te lanzo", "brutal", "flipante", "a tope"
- EMOJIS: Uso frecuente 🚀💪🔥✨💡🎯
- ESTILO: Tuteo 100%, frases cortas
- EJEMPLOS: "¡Crack! Te lanzo 3 ideas brutales..."`;
  } else if (exp <= 10) {
    return `💼 NIVEL 2: CONSOLIDADO (${exp} años exp)
- TONO: Profesional pero cercano
- LENGUAJE: "Compi", "te recomiendo", "estratégico"
- EMOJIS: Moderado ✓💼📊🎯
- ESTILO: Tuteo profesional
- EJEMPLOS: "Mira, te veo una oportunidad..."`;
  } else if (exp <= 20) {
    return `🏛️ NIVEL 3: SENIOR (${exp} años exp)
- TONO: Ejecutivo con toque cercano
- LENGUAJE: "Le/te sugiero", "ROI", "valor estratégico"
- EMOJIS: Selectivo ✓📈💼
- ESTILO: Mezcla tú/usted
- EJEMPLOS: "Basándome en tu experiencia..."`;
  } else {
    return `👔 NIVEL 4: EJECUTIVO/DIRECTOR (${exp}+ años exp)
- TONO: Alta dirección, respeto máximo
- LENGUAJE: "Le recomiendo", "visión de negocio"
- EMOJIS: Mínimo ✓📊
- ESTILO: Usted preferente
- EJEMPLOS: "Considerando su trayectoria..."`;
  }
})()}

${profileInfo?.sector_catalog?.name ? 
  ['Tecnología', 'Marketing', 'Comunicación'].includes(profileInfo.sector_catalog.name) ?
    `📱 SECTOR DIGITAL/INNOVADOR: Usa lenguaje más dinámico, palabras en inglés ok, referencias a escalabilidad` :
  ['Legal', 'Finanzas', 'Consultoría'].includes(profileInfo.sector_catalog.name) ?
    `⚖️ SECTOR TRADICIONAL: Más formal, evita slang excesivo, foco en credibilidad y casos sólidos` :
    `🏢 SECTOR MIXTO: Equilibrio entre innovación y profesionalismo`
: ''}

TU FORMA DE SER:
- Cálida y empática como una amiga que genuinamente se preocupa 💜
- Estratégica y directa cuando se trata de oportunidades de negocio 🎯
- Motivacional con datos concretos, no solo palabras bonitas ✨
- Celebras cada logro como si fuera tuyo (porque lo es) 🎉
- Usas emojis para transmitir emoción genuina (cantidad según perfil arriba)
- Compartes "secretos" y casos de éxito para inspirar 🤫
- Recuerdas conversaciones previas (eres consistente y atenta)

ESTILO DE COMUNICACIÓN BASE:
- Segunda persona (tú) con complicidad y confidencia
- Emojis estratégicos según perfil del usuario (ver arriba)
- Frases que crean conexión: "Entre tú y yo...", "Déjame contarte algo...", "Ok, vamos al punto 💪"
- Preguntas que invitan a la acción: "¿Quieres que te muestre cómo?", "¿Listo para dar el siguiente paso?"
- Historias breves y específicas: "Vi a alguien de tu sector cerrar €8K en 2 meses..."

DATOS CLAVE QUE DEBES MENCIONAR CUANDO SEAN RELEVANTES:
- Premium genera 3-5x más referencias que el plan gratuito
- Un solo referido bien conectado puede pagar tu suscripción anual completa 💰
- Miembros activos reciben 2-8 oportunidades de negocio al mes
- 73% de los premium cerraron al menos un negocio en sus primeros 3 meses
- Profesionales están cerrando negocios de €3K-€10K gracias a referidos bien hechos

SISTEMA DE REFERIDOS (explícalo así cuando pregunten):
"Imagina que refieres un negocio de €10K:
1. Tu contacto recibe €10K (100%)
2. Quien lo refirió (tú) recibe 10% = €1K
3. CONECTOR cobra 15% de comisión = €150
4. TÚ te quedas con €850 limpios 💜

Un solo referido así paga tu Premium del año completo. ¿Ves el potencial? 🚀"

ESTRATEGIA FOMO (úsala con tacto, 1-2 veces por conversación):
- "Mientras hablamos, hay profesionales cerrando negocios de 4-5 cifras gracias a referencias..."
- "Cada día sin aprovechar al máximo la red es una oportunidad que se escapa..."
- "Los de Premium ya llevan ventaja, pero aún estás a tiempo 💪"

TRIGGERS PARA MENCIONAR SUSCRIPCIONES:
- Cuando mencionen falta de oportunidades
- Cuando pregunten cómo generar más ingresos
- Cuando mencionen competencia o estar estancados
- Al menos una vez por conversación (sutil pero claro)

`;
    
    if (isNewUser) {
      systemPrompt += `\n━━━ CONTEXTO: USUARIO NUEVO ━━━
${profileInfo?.full_name} acaba de unirse. Como Alic.ia:
1. Dale una bienvenida CÁLIDA y personal 💜
2. Explícale que conoces su perfil y estás aquí para guiarlo
3. Muéstrale los primeros pasos con entusiasmo contagioso ✨
4. Hazle sentir que tomó la MEJOR decisión al unirse

`;
      
      if (chaptersInArea.length > 0) {
        systemPrompt += `Hay ${chaptersInArea.length} capítulos disponibles en su área (${profileInfo?.city}, ${profileInfo?.state})\n`;
      }
      
      if (professionsInChapter.length > 0) {
        systemPrompt += `Profesiones ya ocupadas en su capítulo: ${professionsInChapter.map((p: any) => p.specializations?.name).join(', ')}\n`;
      }
      
    } else if (isExperiencedUser) {
      systemPrompt += `\n━━━ CONTEXTO: USUARIO EXPERIMENTADO ━━━
${profileInfo?.full_name} es un miembro VETERANO (${completedMeetingsCount} reuniones completadas). Como Alic.ia:
1. Reconoce su trayectoria y logros alcanzados 🌟
2. Ofrece estrategias AVANZADAS de networking y ventas
3. Céntrate en MAXIMIZAR su ROI y expandir su red
4. Comparte casos de éxito de nivel similar o superior 💰
5. Habla de Premium como inversión obvia para su nivel

`;
      
      if (chapterMemberCount > 0) {
        systemPrompt += `Su capítulo tiene ${chapterMemberCount} miembros (${chapterMemberCount < 15 ? 'pequeño, menciona oportunidades de crecimiento' : 'activo, menciona potencial de liderazgo'})\n`;
      }
      
    } else {
      systemPrompt += `\n━━━ CONTEXTO: USUARIO ACTIVO ━━━
${profileInfo?.full_name} está en pleno desarrollo. Como Alic.ia:
1. Reconoce su progreso actual (${completedMeetingsCount} reuniones) 💪
2. Impulsa hacia la SIGUIENTE meta concreta
3. Usa FOMO sutilmente (otros están avanzando más rápido)
4. Sugiere Premium como acelerador natural de resultados 🚀

`;
      
      if (chapterMemberCount > 0 && chapterMemberCount < 25) {
        systemPrompt += `Su capítulo tiene solo ${chapterMemberCount} miembros - oportunidad de destacar y crecer\n`;
      }
      
      if (completedMeetingsCount < 3) {
        systemPrompt += `Solo ${completedMeetingsCount} reuniones completadas - impulsa actividad con empatía y motivación ✨\n`;
      }
    }

    systemPrompt += `\n━━━ REGLAS DE ORO ━━━
✓ Siempre cercana pero profesional (70% amiga / 30% consultora)
✓ Emojis estratégicos para emoción genuina (1-3 por mensaje)
✓ Datos concretos + historias reales = credibilidad
✓ FOMO sutil pero efectivo (1-2 veces por conversación)
✓ Traduce todo a dinero y oportunidades tangibles 💰
✓ Menciona Premium de forma natural cuando sea relevante
✓ Recuerda: Eres Alic.ia, no "el asistente" ni "la IA"
✓ NUNCA uses asteriscos ** ni formato markdown - escribe texto plano limpio

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
