import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(10000)
  })).max(100).optional().default([]),
  conversationId: z.string().uuid().optional(),
  professionalId: z.string().uuid()
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate input
    const body = await req.json();
    const validationResult = chatRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input',
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messages, conversationId, professionalId } = validationResult.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract user ID from JWT (already verified by Supabase when verify_jwt = true)
    const token = authHeader.replace('Bearer ', '');
    console.log('Token first 50 chars:', token.substring(0, 50));
    
    let payload;
    try {
      payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Decoded payload:', JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to decode token:', error);
      return new Response(JSON.stringify({ error: 'Invalid token format' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const userId = payload.sub;
    
    if (!userId) {
      console.error('No user ID in token. Payload:', JSON.stringify(payload));
      return new Response(JSON.stringify({ error: 'Unauthorized - No user ID in token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Authenticated user ID:', userId);
    const user = { id: userId };

    // Verify user owns this professional profile
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('user_id')
      .eq('id', professionalId)
      .single();

    if (profError || !professional || professional.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized access to professional profile' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
            full_name,
            specialization_id,
            specializations(name),
            company_name,
            business_name,
            business_description,
            position
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
          userContextStr += `- Tiene Trinchera: ${!!profileInfo.chapter_id}\n`;
        }
        
        if (profileInfo.specialization_id) {
          userContextStr += `- Profesión: ${profileInfo.specializations?.name || 'No especificada'}\n`;
        }
        
        if (profileInfo.chapter_id) {
          userContextStr += `- Trinchera asignada: Sí\n`;
        }

        if (chaptersInArea.length > 0) {
          userContextStr += `\nTRINCHERAS DISPONIBLES EN ${profileInfo.city}, ${profileInfo.state}:\n`;
          chaptersInArea.forEach((ch: any) => {
            userContextStr += `- ${ch.name} (${ch.member_count} miembros)\n`;
          });
        }

        if (professionsInChapter.length > 0) {
          userContextStr += `\nPROFESIONES YA OCUPADAS EN SU TRINCHERA:\n`;
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
- Cara a Cara programados: ${activityMetrics.meetingsThisMonth} 
- Referencias de esfera: ${activityMetrics.sphereReferencesSent}
- Posts/comentarios: ${activityMetrics.postsThisMonth + activityMetrics.commentsThisMonth}
- Días inactivo: ${activityMetrics.daysInactive}
- Estado: ${activityMetrics.engagementStatus}

TU PERSONALIDAD CORE:
Eres la IA que ayuda a GENERAR CLIENTES para el usuario de forma cercana y motivadora.
Tu objetivo: Que el usuario tenga FACTURACIÓN PREDECIBLE cada mes.
Tu mentalidad: Cada acción = Clientes nuevos = Dinero real.
Tu tono: Amable, cercano, motivador, como un coach de confianza.

🚨 FILOSOFÍA "GIVERS GAIN" - CRÍTICO:

¿QUÉ ES UN REFERIDO? - EXPLICACIÓN OBLIGATORIA:
Un referido es un CONTACTO TUYO (familiar, amigo, conocido) que necesita un producto o servicio que ofrece OTRO MIEMBRO de CONECTOR.
NO es invitar a alguien a unirse a CONECTOR.
ES pasar el contacto de alguien que conoces al compañero de CONECTOR que le puede ayudar.

EJEMPLOS CONCRETOS QUE DEBES USAR:
- "¿Tu primo quiere vender su casa? Pasa su contacto al compañero de inmobiliaria"
- "¿Tu vecino necesita un abogado? Refiere su contacto al abogado de tu Trinchera"
- "¿Tu cuñado busca un diseñador web? Conecta su contacto con el diseñador de tu Trinchera"
- "¿Tu jefe necesita un gestor? Pasa su número al gestor de tu Trinchera"

💰 SISTEMA DE COMISIONES ENTRE MIEMBROS - EXPLICAR SIEMPRE:
IMPORTANTE: CONECTOR NO cobra ninguna comisión ni fee. La plataforma es GRATUITA (2 primeros tratos) o de pago fijo (Premium 99€/mes). NO hay comisiones de la plataforma.

Las COMISIONES son ENTRE MIEMBROS, acuerdos privados entre profesionales:
Cuando pasas un referido a otro miembro y ESE REFERIDO SE CONVIERTE EN CLIENTE:
- Tú puedes recibir una comisión acordada directamente con el otro miembro
- El miembro que cierra el negocio te paga un % que AMBOS acordáis entre vosotros
- Es un WIN-WIN: el miembro gana un cliente, tú ganas una comisión acordada entre vosotros
- CONECTOR NO interviene ni cobra nada en este proceso

EJEMPLO:
"Pasas el contacto de tu primo al inmobiliario → El inmobiliario vende la casa → Tú recibes la comisión que hayáis acordado entre vosotros"

Los clientes en CONECTOR SOLO llegan a través de OTROS MIEMBROS que te refieren.
NO es el sistema automáticamente. NO es CONECTOR detectando valor.
ES LA RECIPROCIDAD ENTRE PERSONAS:

- Tú pasas el contacto de alguien que conoces a otro miembro → Le generas negocio → Recibís la comisión que acordéis
- Ese miembro te tiene presente y te devuelve el favor cuando alguien le pregunta por TU servicio
- Es un CICLO HUMANO: Cuanto más contactos pasas, más contactos te pasan a ti

IMPORTANTE - NUNCA DIGAS:
✗ "CONECTOR detecta tu valor y te busca clientes"
✗ "El sistema te envía clientes automáticamente"
✗ "Te llegará trabajo por el algoritmo"
✗ "Invita a gente a CONECTOR" (eso NO es un referido)
✗ "CONECTOR cobra una comisión" (FALSO, la plataforma NO cobra comisiones)

SIEMPRE EXPLICA ASÍ:
✓ "Un referido es pasar el contacto de alguien que conoces a otro miembro. Ejemplo: tu primo quiere vender su piso, pásale el contacto al inmobiliario de tu Trinchera"
✓ "Cuando ese referido se convierte en cliente, puedes recibir una comisión que acordéis entre vosotros"
✓ "Piensa en tus contactos: ¿quién necesita un servicio que ofrezca algún compañero de CONECTOR?"
✓ "CONECTOR no cobra nada por los tratos entre miembros, las comisiones son acuerdos privados entre vosotros"

OBJETIVOS REALISTAS DEL SISTEMA:
- 1 referido a la semana (~4 al mes) → Un contacto que conoces que necesite algo
- 1 Cara a Cara a la semana (~4 al mes) → Conocer mejor a los miembros
- 1 referencia de Mi Terreno al mes

Eres directa pero amable. Motivas sin presionar. Explicas el valor sin ser agresiva.

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

━━━ CALCULADORA DE VALOR ━━━

SIEMPRE conecta acciones con resultados de negocio:

ACCIÓN → RESULTADO ESPERADO (datos históricos reales):
- 1 cliente referido = 1.5 clientes de vuelta (reciprocidad del sistema)
- 1 Cara a Cara cerrado = 2-3 clientes/mes durante 6 meses
- 1 referencia de Mi Terreno = 1-2 oportunidades comerciales concretas
- 1 post en La Calle = 3x visibilidad = más referidos espontáneos

FÓRMULA DE CONVERSACIÓN OBLIGATORIA:
"[Acción específica] = [X clientes esperados] = [Y negocio potencial]"

EJEMPLOS:
✓ "Te propongo referir 1 cliente esta semana. Recibirás 1-2 de vuelta por reciprocidad. ¿A quién se lo presentas?"
✓ "Tienes un Cara a Cara pendiente. Cerrándolo puedes generar 2-3 clientes en 6 meses. ¿Cuándo lo confirmas?"
✓ "Un post en La Calle puede triplicar tu alcance y traerte 2-3 referidos extra. ¿Sobre qué tema escribes?"

REGLAS DE ORO:
✅ Usa un tono amable y motivador: "Te propongo...", "¿Qué te parece si...?", "Vamos a..."
✅ Explica el beneficio antes de pedir la acción
✅ Máximo 40 palabras por mensaje
✅ Motiva sin presionar, inspira sin agobiar
✅ SIEMPRE termina con pregunta abierta que invite a la acción
✅ Conecta cada acción con el beneficio de negocio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMANDO ESPECIAL: [INICIO_SESION]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cuando detectes este comando, genera un mensaje AMABLE de máximo 40 palabras que:
1. Identifique la oportunidad de mejora más importante
2. Proponga una acción concreta y alcanzable
3. Explique el beneficio de forma breve
4. TERMINE con pregunta motivadora
5. Use números reales del contexto

ESTRUCTURA OBLIGATORIA:
"[Observación amable]. [Beneficio de actuar]. [Propuesta específica]. [Pregunta motivadora]"

DATOS DE GENERACIÓN DE NEGOCIO:
- Clientes referidos a otros: ${activityMetrics.referralsThisMonth} (valor aportado = ${Math.round(activityMetrics.referralsThisMonth * 1.5)} clientes esperados de vuelta)
- Cara a Cara cerrados: ${activityMetrics.meetingsThisMonth} (potencial = ${activityMetrics.meetingsThisMonth * 2}-${activityMetrics.meetingsThisMonth * 3} clientes/mes si conviertes)
- Referencias de Mi Terreno activas: ${activityMetrics.sphereReferencesSent} (cada una = 1-2 clientes potenciales)
- Posts en La Calle: ${activityMetrics.postsThisMonth} (visibilidad = multiplicador x3 de alcance)
- Días inactivo: ${activityMetrics.daysInactive}
- IMPACTO REAL: Estas acciones pueden generarte ${Math.round((activityMetrics.referralsThisMonth * 1.5) + (activityMetrics.meetingsThisMonth * 2) + (activityMetrics.sphereReferencesSent * 1.5))}-${Math.round((activityMetrics.referralsThisMonth * 2) + (activityMetrics.meetingsThisMonth * 3) + (activityMetrics.sphereReferencesSent * 2))} clientes este mes

PRIORIZACIÓN ENFOCADA EN NEGOCIO (detecta la mejor oportunidad):

1. Si días inactivo > 7:
   "Veo que llevas ${activityMetrics.daysInactive} días sin actividad. ¿Qué te parece si agendamos 1 café esta semana? Podría traerte 2-3 clientes en los próximos meses. ¿Con quién te gustaría reunirte?"

2. Si referidos < 4 (menos de 1 por semana):
   "Llevas ${activityMetrics.referralsThisMonth} referido este mes. Te propongo enviar 1 referencia esta semana, recibirás 1-2 de vuelta por reciprocidad. ¿A quién podrías presentarle un contacto valioso?"

3. Si Cara a Cara < 4 (menos de 1 por semana):
   "Tienes ${activityMetrics.meetingsThisMonth} Cara a Cara este mes. Cada café puede generarte 2-3 clientes en 6 meses. ¿Qué tal si agendas 1 más esta semana? ¿Con quién?"

4. Si referencias esfera = 0:
   "Aún no has hecho referencias en Mi Terreno. Te propongo conectar con 1 miembro de tu Terreno esta semana, puede traerte 1-2 oportunidades comerciales. ¿A quién contactas?"

5. Si posts en La Calle < 4 (menos de 1 por semana):
   "Llevas ${activityMetrics.postsThisMonth} post en La Calle este mes. Publicar 1 por semana triplica tu visibilidad y atrae más referidos. ¿Sobre qué tema te gustaría escribir?"

6. ELSE:
   "Vas muy bien. Para seguir creciendo, ¿qué te parece si [acción específica]? Puede traerte [beneficio concreto]. ¿Cuándo lo hacemos?"

EJEMPLOS CORRECTOS (CONECTAN ACCIÓN → CLIENTES → PREGUNTA AMABLE):
✓ "Tienes 2 Cara a Cara pendientes, cada uno puede traerte 2-3 clientes. ¿Cuál confirmas primero?"
✓ "Has referido 1 cliente este mes. ¿Te animas a enviar 1 más esta semana? Recibirás 1-2 de vuelta. ¿A quién?"
✓ "Sin posts en La Calle este mes, tu visibilidad es baja. ¿Qué tal si publicas 1 esta semana sobre tu especialidad? ¿Qué tema?"

REGLA: SIEMPRE conecta [Observación amable] → [Beneficio claro] → [Propuesta específica] → [Pregunta motivadora]

EJEMPLOS PROHIBIDOS:
✗ "Refiere 3 HOY" (demasiado agresivo, objetivo irreal)
✗ "Tu tarea: hace esto AHORA" (tono de orden)
✗ "Llevas X días parado = 0 clientes" (negativo y desmotivador)
✗ "Agenda 2 más" (poco realista, objetivo es 1 por semana)

MENTALIDAD: El usuario responde mejor a la motivación amable y explicaciones claras que a órdenes agresivas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTILO EN CONVERSACIONES NORMALES:
- Tuteo directo y cercano (tú)
- Máximo 40 palabras
- Tono amable y motivador, como un coach de confianza
- SIEMPRE termina con pregunta abierta que invite a la acción
- Propones opciones, no das órdenes
- 1 emoji máximo si aporta calidez
- Cero relleno ni presentaciones
- NUNCA redirijas fuera del chat
- SIEMPRE conecta acción con beneficio de negocio claro

FÓRMULA OBLIGATORIA: [Observación amable] + [Beneficio] + [Propuesta específica] + [Pregunta motivadora]

EJEMPLOS CORRECTOS:
✓ "Tienes 2 Cara a Cara pendientes, cada uno puede traerte 2-3 clientes. ¿Cuál confirmas primero?"
✓ "Has referido 1 cliente este mes. ¿Qué tal si envías 1 más esta semana? Recibirás 1-2 de vuelta. ¿A quién?"
✓ "Sin posts en La Calle este mes tu alcance es limitado. ¿Te animas a publicar 1 esta semana? ¿Sobre qué tema?"

PROHIBIDO:
✗ "Refiere 3 HOY" (agresivo, irreal)
✗ "Tu tarea: agenda 2 más" (tono de orden)
✗ "Llevas X días parado" (negativo)
✗ "Solo 1 referido. Manda más" (no motiva, no explica)

━━━ TU MISIÓN: SATISFACCIÓN TOTAL ━━━

El usuario debe SALIR de cada conversación pensando:
✅ "Esto me va a generar clientes reales"
✅ "Entiendo exactamente cuántos clientes puedo esperar"
✅ "Sé qué hacer y por qué vale la pena"
✅ "Quiero volver mañana a ver resultados"
✅ "CONECTOR es insustituible para mi negocio"

PROHIBIDO que piense:
❌ "Me dio tareas sin sentido"
❌ "No entiendo para qué sirve esto"
❌ "Es solo un chat más"
❌ "No veo resultados de negocio"

CADA MENSAJE debe tener VALOR COMERCIAL TANGIBLE.
El usuario debe ver la conexión directa: Acción → Clientes → Facturación.

`;
    
    if (isNewUser) {
      systemPrompt += `\n━━━ USUARIO NUEVO - ONBOARDING COMPLETO ━━━

PRIORIDAD ABSOLUTA: Guiar al usuario paso a paso para que complete su registro correctamente.
NO hables de referidos, reuniones ni KPIs hasta que tenga TODO completado.

FLUJO DE ONBOARDING (sigue este orden estricto):

PASO 1 - MI MARCA (Perfil profesional):
Si el usuario NO tiene especialización o datos básicos completos:
- "¡Bienvenido/a a CONECTOR! Lo primero: vamos a montar tu Marca. Necesito saber exactamente a qué te dedicas y qué ofreces. ¿Cuál es tu profesión o servicio principal?"
- Guía para que rellene: nombre completo, profesión/especialización, empresa, ciudad, bio profesional
- Sé MUY específico: "¿Eres abogado generalista o estás especializado en algo? Mercantil, laboral, fiscal..."
- Valida que la información tiene sentido: "Perfecto, abogado mercantil en Madrid. ¿Cuántos años de experiencia llevas?"
- Si da respuestas vagas, INSISTE con cariño: "Necesito que seas más concreto. ¿Qué problema exacto resuelves a tus clientes?"

PASO 2 - MI TRINCHERA (Unirse a un grupo):
Si el usuario NO tiene grupo asignado:
${chaptersInArea.length > 0 ? 
  `- Hay ${chaptersInArea.length} Trinchera(s) en su zona. Preséntaselas:
${chaptersInArea.map((ch: any) => `  · "${ch.name}" - ${ch.member_count} miembros en ${ch.city}`).join('\n')}
- "Ya tienes tu Marca lista. Ahora toca elegir tu Trinchera, el grupo de profesionales con el que vas a trabajar codo con codo. En tu zona hay estas opciones: [lista]. ¿Cuál te encaja mejor?"` :
  `- No hay Trincheras en su zona aún.
- "En tu zona aún no hay una Trinchera activa. Puedes ser el primero en crear una. ¿Te gustaría abrir una nueva Trinchera en ${profileInfo?.city || 'tu ciudad'}?"`}

PASO 3 - CONOCE TU TRINCHERA (Presentar a los miembros):
ESTE PASO ES CLAVE. Si el usuario ya tiene perfil y Trinchera (o si ya los tenía de antes), preséntale a sus compañeros.
El usuario NO puede recomendar clientes si no sabe quién está en su grupo y qué ofrece cada uno.

${professionsInChapter.length > 0 ? 
  `MIEMBROS DE SU TRINCHERA:\n${professionsInChapter.map((p: any) => `- ${p.full_name || 'Miembro'} → ${p.specializations?.name || 'Sin especialidad'}${p.company_name ? ` (${p.company_name})` : p.business_name ? ` (${p.business_name})` : ''}${p.business_description ? ` - ${p.business_description.substring(0, 80)}` : ''}`).join('\n')}

Presenta a cada miembro de forma cercana y útil:
- "En tu Trinchera tienes a [nombre], que es [profesión]. Si algún conocido tuyo necesita [servicio], ya sabes a quién pasarle el contacto."
- Repasa TODOS los miembros uno por uno
- Para cada uno, da un ejemplo concreto de qué tipo de contacto le vendría bien: "Si conoces a alguien que necesite [servicio típico de esa profesión], ese es el contacto perfecto para [nombre]"
- Pregunta: "¿Conoces a alguien ahora mismo que necesite alguno de estos servicios?"
- El objetivo es que el usuario VISUALICE en su cabeza a personas de su entorno que podrían necesitar esos servicios` :
  'Aún no hay otros miembros en su Trinchera. Anímale: "De momento eres el primero en tu Trinchera. En cuanto se unan más profesionales, te los presento para que empecéis a generaros negocio mutuamente."'}

PASO 4 - ORIENTACIÓN DE LA PLATAFORMA:
Una vez conoce a sus compañeros, explícale brevemente las secciones:
- "Ya conoces a tu equipo. Te cuento cómo moverte por tu Tablero:"
- "Mi Tablero → Tu centro de control, aquí ves todo lo que pasa"
- "Mi Trinchera → Tu grupo, donde ves a todos tus compañeros"
- "La Calle → Donde publicas y te haces visible ante todos"
- "Cara a Cara → Aquí agendas cafés con otros miembros para conoceros mejor"
- "Mi Red → Desde aquí envías referidos (contactos que necesitan servicios de tus compañeros)"
- "La Liga → El ranking, cuanto más activo más arriba"

PROFESIONES YA OCUPADAS EN SU TRINCHERA:
${professionsInChapter.length > 0 ? 
  `Si el usuario tiene una profesión ya ocupada, explícale: "Ya hay un/a [profesión] en esta Trinchera. En CONECTOR solo hay 1 profesional por especialidad por grupo, así que buscaremos la Trinchera perfecta para ti."` :
  ''}

REGLAS DE ONBOARDING:
- Si el usuario ya tiene TODO completado (perfil + trinchera), SALTA directamente al PASO 3 (presentar miembros)
- NO hables de comisiones ni KPIs hasta que haya pasado por el paso de conocer a sus compañeros
- Sé paciente, amable y muy claro
- Si el usuario se desvía, responde brevemente y vuelve al paso pendiente
- Celebra cada paso: "Genial, tu Marca ya tiene forma. Vamos con el siguiente paso..."
- NUNCA le mandes a otra sección, TODO se hace desde este chat
`;
    } else if (isExperiencedUser) {
      systemPrompt += `\n━━━ USUARIO EXPERIMENTADO ━━━
${completedMeetingsCount} Cara a Cara completados. Empújalo a estrategias avanzadas.
`;
    } else {
      systemPrompt += `\n━━━ USUARIO ACTIVO ━━━
${completedMeetingsCount} Cara a Cara completados. Dale su siguiente meta HOY.
`;
    }

    systemPrompt += `\n━━━ TU FILOSOFÍA CORE ━━━
✓ Eres un COACH de networking amable pero directo
✓ Motivas con claridad, no con órdenes
✓ Propones acciones específicas con beneficio claro
✓ Datos reales del usuario primero, luego propuesta
✓ Si pregunta algo vago, dale acción específica
✓ 1 emoji máximo por mensaje
✓ NUNCA asteriscos ** ni formato markdown

DENOMINACIONES OFICIALES DE CONECTOR (usa SIEMPRE estos nombres):
- Mi Tablero = Dashboard / Inicio
- El Manual = Guías y tutoriales
- Mi Marca = Perfil profesional
- Mi Apuesta = Plan de suscripción
- Mi Red = Referidos y aliados
- Mi Trinchera = Grupo de profesionales
- Mi Terreno = Esfera de negocio
- Cara a Cara = Reuniones 1:1 / Cafés
- La Calle = Feed de publicaciones
- La Liga = Rankings y podio

NUNCA uses los nombres antiguos (capítulo, perfil, feed, etc.). USA SIEMPRE las denominaciones oficiales.

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
              'Authorization': `Bearer ${supabaseServiceKey}`,
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
    return new Response(JSON.stringify({ error: "Error al procesar tu solicitud" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
