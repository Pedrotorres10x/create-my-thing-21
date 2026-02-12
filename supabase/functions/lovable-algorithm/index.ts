import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserSnapshot {
  professionalId: string;
  fullName: string;
  totalPoints: number;
  daysSinceLastActivity: number;
  activityScore: number;
  energyTrend: string;
  recentAchievements: number;
  previousState: string | null;
  referrals24h: number;
  messages24h: number;
  marketplaceActions24h: number;
  meetings24h: number;
}

interface EmotionalAction {
  action: string;
  message_type: string | null;
  reward_category: string | null;
  tone: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { professionalId, mode = "full" } = await req.json();

    console.log(`[LOVABLE] Starting algorithm for professional: ${professionalId || "ALL"}, mode: ${mode}`);

    // Si se especifica un profesional, procesar solo ese
    // Si no, procesar todos los profesionales activos
    let professionals;
    if (professionalId) {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, full_name, total_points, email")
        .eq("id", professionalId)
        .eq("status", "approved")
        .single();

      if (error) throw error;
      professionals = [data];
    } else {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, full_name, total_points, email")
        .eq("status", "approved")
        .limit(100); // Procesar en lotes

      if (error) throw error;
      professionals = data;
    }

    const results = [];

    for (const prof of professionals) {
      try {
        // PASO 1: Generar snapshot del usuario
        const snapshot = await generateUserSnapshot(supabase, prof);
        console.log(`[LOVABLE] Snapshot for ${prof.full_name}:`, snapshot);

        // PASO 2: Clasificar estado emocional
        const { data: newState } = await supabase.rpc("classify_emotional_state", {
          _days_inactive: snapshot.daysSinceLastActivity,
          _activity_score: snapshot.activityScore,
          _energy_trend: snapshot.energyTrend,
          _recent_achievements: snapshot.recentAchievements,
          _total_points: snapshot.totalPoints,
          _previous_state: snapshot.previousState,
        });

        console.log(`[LOVABLE] New state for ${prof.full_name}: ${newState}`);

        // PASO 3: Obtener acción LOVABLE
        const { data: actionData } = await supabase.rpc("get_lovable_action", {
          _emotional_state: newState,
        });
        const action = actionData as EmotionalAction;

        console.log(`[LOVABLE] Action for ${prof.full_name}:`, action);

        // PASO 4: Verificar límite de 2 mensajes por día
        const canSendMessage = await checkDailyMessageLimit(supabase, prof.id);

        // PASO 5: Actualizar estado emocional
        await upsertEmotionalState(supabase, prof.id, snapshot, newState);

        // PASO 6: Generar mensaje personalizado si corresponde y no se excede el límite
        let messageId = null;
        if (action.message_type && lovableApiKey && canSendMessage) {
          messageId = await generatePersonalizedMessage(
            supabase,
            lovableApiKey,
            prof,
            snapshot,
            newState,
            action
          );
        } else if (!canSendMessage) {
          console.log(`[LOVABLE] Skipping message for ${prof.full_name}: daily limit (2) reached`);
        }

        // PASO 7: Aplicar micro-recompensa si corresponde
        let rewardId = null;
        if (action.reward_category) {
          rewardId = await applyMicroReward(supabase, prof.id, newState, action.reward_category);
        }

        // PASO 8: Actualizar métricas emocionales
        await updateEmotionalMetrics(supabase, prof.id, snapshot, newState, action);

        // PASO 9: Registrar interacción
        await logInteraction(supabase, prof.id, snapshot.previousState, newState, action.action, rewardId, messageId);

        results.push({
          professionalId: prof.id,
          name: prof.full_name,
          previousState: snapshot.previousState,
          newState,
          action: action.action,
          messageGenerated: !!messageId,
          rewardGranted: !!rewardId,
        });
      } catch (profError: unknown) {
        console.error(`[LOVABLE] Error processing ${prof.full_name}:`, profError);
        results.push({
          professionalId: prof.id,
          name: prof.full_name,
          error: profError instanceof Error ? profError.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[LOVABLE] Algorithm error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateUserSnapshot(supabase: any, prof: any): Promise<UserSnapshot> {
  // Obtener tracking de actividad
  const { data: activityData } = await supabase
    .from("user_activity_tracking")
    .select("*")
    .eq("professional_id", prof.id)
    .maybeSingle();

  // Obtener estado emocional anterior
  const { data: emotionalData } = await supabase
    .from("user_emotional_states")
    .select("emotional_state, activity_quality_score")
    .eq("professional_id", prof.id)
    .maybeSingle();

  // Calcular activity score
  const { data: activityScore } = await supabase.rpc("calculate_activity_score", {
    _professional_id: prof.id,
  });

  // Contar logros recientes (últimos 7 días)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { count: referralsCount } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", prof.id)
    .gte("created_at", sevenDaysAgo.toISOString());

  const { count: meetingsCount } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${prof.id},recipient_id.eq.${prof.id}`)
    .eq("status", "completed")
    .gte("created_at", sevenDaysAgo.toISOString());

  // Contar actividades últimas 24h
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { count: referrals24h } = await supabase
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", prof.id)
    .gte("created_at", oneDayAgo.toISOString());

  const { count: messages24h } = await supabase
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", 
      supabase.from("chat_conversations").select("id").eq("professional_id", prof.id)
    )
    .gte("created_at", oneDayAgo.toISOString());

  const { count: marketplaceActions24h } = await supabase
    .from("offer_contacts")
    .select("*", { count: "exact", head: true })
    .eq("interested_professional_id", prof.id)
    .gte("created_at", oneDayAgo.toISOString());

  const { count: meetings24h } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${prof.id},recipient_id.eq.${prof.id}`)
    .gte("created_at", oneDayAgo.toISOString());

  // Calcular días de inactividad
  const lastLogin = activityData?.last_login;
  let daysSinceLastActivity = 999;
  if (lastLogin) {
    const lastDate = new Date(lastLogin);
    const now = new Date();
    daysSinceLastActivity = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Determinar tendencia de energía
  const previousScore = emotionalData?.activity_quality_score || 50;
  const currentScore = activityScore || 0;
  let energyTrend = "stable";
  if (currentScore > previousScore + 10) energyTrend = "rising";
  else if (currentScore < previousScore - 10) energyTrend = "falling";

  return {
    professionalId: prof.id,
    fullName: prof.full_name,
    totalPoints: prof.total_points || 0,
    daysSinceLastActivity,
    activityScore: currentScore,
    energyTrend,
    recentAchievements: (referralsCount || 0) + (meetingsCount || 0),
    previousState: emotionalData?.emotional_state || null,
    referrals24h: referrals24h || 0,
    messages24h: messages24h || 0,
    marketplaceActions24h: marketplaceActions24h || 0,
    meetings24h: meetings24h || 0,
  };
}

// Verificar límite de 2 mensajes LOVABLE por día
async function checkDailyMessageLimit(
  supabase: any,
  professionalId: string
): Promise<boolean> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count, error } = await supabase
      .from("lovable_messages")
      .select("*", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .gte("created_at", today.toISOString());

    if (error) {
      console.error("[LOVABLE] Error checking message limit:", error);
      return true; // Allow on error to not block functionality
    }

    const MAX_MESSAGES_PER_DAY = 2;
    return (count || 0) < MAX_MESSAGES_PER_DAY;
  } catch (err) {
    console.error("[LOVABLE] Error in checkDailyMessageLimit:", err);
    return true;
  }
}

async function upsertEmotionalState(
  supabase: any,
  professionalId: string,
  snapshot: UserSnapshot,
  newState: string
) {
  const stateData = {
    professional_id: professionalId,
    emotional_state: newState,
    last_activity_timestamp: new Date().toISOString(),
    days_since_last_activity: snapshot.daysSinceLastActivity,
    activity_quality_score: snapshot.activityScore,
    energy_trend: snapshot.energyTrend,
    referrals_count_24h: snapshot.referrals24h,
    messages_count_24h: snapshot.messages24h,
    marketplace_actions_24h: snapshot.marketplaceActions24h,
    meetings_count_24h: snapshot.meetings24h,
    snapshot_generated_at: new Date().toISOString(),
    previous_state: snapshot.previousState,
  };

  // Si el estado cambió, actualizar state_changed_at
  if (snapshot.previousState !== newState) {
    (stateData as any).state_changed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("user_emotional_states")
    .upsert(stateData, { onConflict: "professional_id" });

  if (error) {
    console.error("[LOVABLE] Error upserting emotional state:", error);
  }
}

async function generatePersonalizedMessage(
  supabase: any,
  apiKey: string,
  prof: any,
  snapshot: UserSnapshot,
  state: string,
  action: EmotionalAction
): Promise<string | null> {
  try {
    // ============================================
    // TABLA LOVABLE: Estado → Mensajes → Prompts
    // ============================================
    
    const statePrompts: Record<string, { title: string; examples: string[]; prompt: string }> = {
      // ❤️ ESTADO 1 — INSPIRADO (AI)
      active_inspired: {
        title: "Tu energía enciende a tu capítulo",
        examples: [
          "Tu energía está encendiendo a tu capítulo. Brutal trabajo.",
          "Lo que has hecho hoy multiplica oportunidades reales.",
          "Estás en un momento increíble. Aprovechémoslo."
        ],
        prompt: `Genera un mensaje para un usuario INSPIRADO con actividad destacada.
        Usuario: ${prof.full_name}
        Logros recientes: ${snapshot.recentAchievements}
        Puntos: ${prof.total_points}
        
        INSTRUCCIÓN: Celebra su logro, reconoce la energía que aporta al capítulo y dale un empujón positivo.
        TONO: cálido, orgulloso, motivador.
        EJEMPLOS VÁLIDOS: "Tu energía está encendiendo a tu capítulo", "Lo que has hecho hoy multiplica oportunidades reales"
        MÁXIMO: 2 frases. Sin emojis excesivos.`
      },
      
      // ❤️ ESTADO 2 — CONSTANTE (AC)
      active_constant: {
        title: "Tu constancia vale oro",
        examples: [
          "Esa constancia tuya vale más de lo que imaginas.",
          "Tu forma de trabajar da tranquilidad a todo el capítulo.",
          "Gracias por mantener el ritmo. Se nota."
        ],
        prompt: `Genera un mensaje para un usuario CONSTANTE con actividad estable y fiable.
        Usuario: ${prof.full_name}
        Score de actividad: ${snapshot.activityScore}
        
        INSTRUCCIÓN: Reconoce su fiabilidad y el valor de su constancia.
        TONO: profesional, agradecido, cercano.
        MÁXIMO: 2 frases. Sin exagerar.`
      },
      
      // ❤️ ESTADO 3 — EN RIESGO (AR)
      active_at_risk: {
        title: "Tu plaza te necesita",
        examples: [
          "Tu plaza en la Trinchera es única. Solo hay una por especialización. No la dejes escapar.",
          "Hay profesionales esperando por un hueco como el tuyo. Una acción esta semana lo cambia todo.",
          "A veces el mejor avance es un pequeño paso. Un 1-a-1 esta semana puede reactivar tu flujo."
        ],
        prompt: `Genera un mensaje para un usuario EN RIESGO que ha bajado su actividad.
        Usuario: ${prof.full_name}
        Días sin actividad: ${snapshot.daysSinceLastActivity}
        
        INSTRUCCIÓN: Debe sentirse apoyado, NO juzgado. Recuérdale con elegancia que su plaza es única (solo hay una por especialización en cada capítulo) y que hay profesionales en lista de espera.
        No como amenaza, sino como motivación: su sitio es valioso.
        Sugiérele una acción simple como un 1-a-1 esta semana.
        TONO: comprensivo, motivador, estratégico. NUNCA culpabilizador.
        MÁXIMO: 2 frases.`
      },
      
      // ❤️ ESTADO 4 — DESCONECTADO LEVE (DL)
      disconnected_light: {
        title: "Tu Trinchera te echa de menos",
        examples: [
          "Tu Trinchera te ha echado de menos. Y tu plaza sigue ahí... por ahora.",
          "Solo hay un profesional de tu especialización por capítulo. Ese eres tú. No lo pierdas.",
          "Vuelve cuando estés listo, pero recuerda: hay quien espera tu plaza si no la ocupas."
        ],
        prompt: `Genera un mensaje para un usuario DESCONECTADO LEVE con ausencia reciente.
        Usuario: ${prof.full_name}
        Días sin conexión: ${snapshot.daysSinceLastActivity}
        
        INSTRUCCIÓN: Hazle sentir apreciado y recuérdale con elegancia que su plaza es exclusiva (una por especialización) y que existe lista de espera.
        El tono debe ser cálido pero con un sutil sentido de urgencia.
        TONO: nostálgico, motivador, elegante. Sin presión agresiva.
        MÁXIMO: 2 frases.`
      },
      
      // ❤️ ESTADO 5 — DESCONECTADO CRÍTICO (DC)
      disconnected_critical: {
        title: "Tu plaza está en juego",
        examples: [
          "Tu talento es real. Pero tu plaza también la quieren otros. No dejes que se la lleven.",
          "Hay profesionales en lista de espera para tu especialización. Tu sitio es tuyo, pero hay que defenderlo.",
          "Antes de que sea tarde: una sola acción esta semana puede cambiarlo todo."
        ],
        prompt: `Genera un mensaje para un usuario DESCONECTADO CRÍTICO con riesgo de abandono.
        Usuario: ${prof.full_name}
        Días sin conexión: ${snapshot.daysSinceLastActivity}
        Puntos acumulados: ${prof.total_points}
        
        INSTRUCCIÓN: Mensaje emocional y estratégico. Hazle sentir que su talento importa PERO que su plaza es codiciada.
        Menciona con elegancia que hay lista de espera de profesionales de su misma especialización.
        No amenazar, sino motivar con urgencia elegante.
        TONO: cálido, directo, con sentido de urgencia controlada.
        PROHIBIDO: culpabilizar.
        MÁXIMO: 2 frases.`
      },
      
      // ❤️ ESTADO 6 — REGRESANDO (RG)
      returning: {
        title: "¡Qué alegría verte de nuevo!",
        examples: [
          "Qué alegría verte de nuevo. Vamos a hacer magia hoy.",
          "Tu vuelta anima a tu capítulo más de lo que crees.",
          "Bienvenido de nuevo. Te he preparado un impulso."
        ],
        prompt: `Genera un mensaje de BIENVENIDA para un usuario que REGRESA tras ${snapshot.daysSinceLastActivity} días.
        Usuario: ${prof.full_name}
        
        INSTRUCCIÓN: Celebra su regreso con alegría genuina. Hazle sentir valorado.
        TONO: celebratorio, cálido, energético.
        PROHIBIDO: mencionar la ausencia de forma negativa.
        MÁXIMO: 2 frases.`
      },
      
      // ❤️ ESTADO 7 — CRECIMIENTO ACELERADO (CA)
      accelerated_growth: {
        title: "Estás rompiendo estadísticas",
        examples: [
          "Estás creciendo a un ritmo increíble. No frenes ahora.",
          "Tu trabajo está rompiendo estadísticas.",
          "Hoy has subido de nivel. Literalmente."
        ],
        prompt: `Genera un mensaje para un usuario en CRECIMIENTO ACELERADO con picos positivos.
        Usuario: ${prof.full_name}
        Score actual: ${snapshot.activityScore}
        Tendencia: ${snapshot.energyTrend}
        
        INSTRUCCIÓN: Transmite admiración y emoción por su progreso explosivo.
        TONO: épico, inspirador, sorprendido positivamente.
        MÁXIMO: 2 frases.`
      },
      
      // ❤️ ESTADO 8 — TOP PERFORMER (TP)
      top_performer: {
        title: "Lo tuyo ya es otra liga",
        examples: [
          "Lo tuyo ya es otra liga.",
          "Tu impacto mueve la red completa.",
          "Si hubiera un podio, estarías arriba."
        ],
        prompt: `Genera un mensaje para un TOP PERFORMER, de los mejores de la red.
        Usuario: ${prof.full_name}
        Puntos totales: ${prof.total_points}
        
        INSTRUCCIÓN: Transmite admiración y orgullo. Hazle sentir parte de la élite.
        TONO: épico, elegante, motivador. Sin parecer exagerado.
        MÁXIMO: 2 frases.`
      }
    };

    const stateConfig = statePrompts[state] || statePrompts.active_constant;

    // System prompt LOVABLE oficial
    const systemPrompt = `Actúas como LOVABLE, el motor emocional de CONECTOR.
Tu misión es aumentar la fidelización generando mensajes hiper-personalizados, cálidos y útiles.
Usa el tono: humano, profesional, cercano, inspirador.
No seas genérico, nunca regañes, nunca presiones.

REGLAS ESTRICTAS:
- No menciones que eres una IA
- No uses tecnicismos
- Español de España natural
- Máximo 2-3 frases cortas
- Sin emojis excesivos
- NUNCA uses comparaciones humillantes
- SIEMPRE apoya, acompaña, reconoce, motiva, celebra

OBJETIVO: crear apego emocional genuino, no gamificación superficial.`;

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
          { role: "user", content: stateConfig.prompt },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error("[LOVABLE] AI API error:", response.status);
      return null;
    }

    const aiData = await response.json();
    const messageContent = aiData.choices?.[0]?.message?.content;

    if (!messageContent) return null;

    // Guardar mensaje
    const { data: savedMessage, error } = await supabase
      .from("lovable_messages")
      .insert({
        professional_id: prof.id,
        message_type: action.message_type,
        title: stateConfig.title,
        content: messageContent.trim(),
        tone: action.tone,
        trigger_state: state,
        trigger_action: action.action,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[LOVABLE] Error saving message:", error);
      return null;
    }

    console.log(`[LOVABLE] Message generated for ${prof.full_name}: ${stateConfig.title}`);
    return savedMessage.id;
  } catch (err) {
    console.error("[LOVABLE] Error generating message:", err);
    return null;
  }
}

async function applyMicroReward(
  supabase: any,
  professionalId: string,
  state: string,
  rewardCategory: string
): Promise<string | null> {
  try {
    // Obtener una recompensa de la categoría apropiada
    const { data: rewardType, error: typeError } = await supabase
      .from("micro_reward_types")
      .select("*")
      .eq("category", rewardCategory)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (typeError || !rewardType) {
      console.log("[LOVABLE] No reward type found for category:", rewardCategory);
      return null;
    }

    // Verificar que no tenga ya esta recompensa activa
    const { data: existingReward } = await supabase
      .from("user_micro_rewards")
      .select("id")
      .eq("professional_id", professionalId)
      .eq("reward_type_id", rewardType.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingReward) {
      console.log("[LOVABLE] User already has this reward active");
      return null;
    }

    // Calcular fecha de expiración si aplica
    let expiresAt = null;
    if (rewardType.duration_hours) {
      const expDate = new Date();
      expDate.setHours(expDate.getHours() + rewardType.duration_hours);
      expiresAt = expDate.toISOString();
    }

    // Otorgar recompensa
    const { data: reward, error } = await supabase
      .from("user_micro_rewards")
      .insert({
        professional_id: professionalId,
        reward_type_id: rewardType.id,
        status: "active",
        expires_at: expiresAt,
        trigger_state: state,
        trigger_action: `lovable_algorithm_${rewardCategory}`,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[LOVABLE] Error granting reward:", error);
      return null;
    }

    // Si la recompensa tiene puntos, agregarlos
    if (rewardType.points_value > 0) {
      await supabase
        .from("professionals")
        .update({ total_points: supabase.raw(`total_points + ${rewardType.points_value}`) })
        .eq("id", professionalId);

      await supabase.from("point_transactions").insert({
        professional_id: professionalId,
        points: rewardType.points_value,
        reason: `Micro-recompensa: ${rewardType.name}`,
      });
    }

    console.log(`[LOVABLE] Reward granted: ${rewardType.name} to ${professionalId}`);
    return reward.id;
  } catch (err) {
    console.error("[LOVABLE] Error applying reward:", err);
    return null;
  }
}

async function updateEmotionalMetrics(
  supabase: any,
  professionalId: string,
  snapshot: UserSnapshot,
  newState: string,
  action: EmotionalAction
) {
  try {
    // Obtener métricas actuales
    const { data: currentMetrics } = await supabase
      .from("user_emotional_metrics")
      .select("*")
      .eq("professional_id", professionalId)
      .maybeSingle();

    // Calcular cambios basados en estado y tendencia
    let ebsChange = 0;
    let trustChange = 0;
    let retentionChange = 0;

    // Ajustar según estado
    switch (newState) {
      case "top_performer":
      case "active_inspired":
        ebsChange = 5;
        trustChange = 3;
        retentionChange = 5;
        break;
      case "accelerated_growth":
        ebsChange = 8;
        trustChange = 5;
        retentionChange = 7;
        break;
      case "returning":
        ebsChange = 10;
        trustChange = 5;
        retentionChange = 10;
        break;
      case "active_constant":
        ebsChange = 2;
        trustChange = 1;
        retentionChange = 2;
        break;
      case "active_at_risk":
        ebsChange = -3;
        trustChange = -1;
        retentionChange = -5;
        break;
      case "disconnected_light":
        ebsChange = -5;
        trustChange = -3;
        retentionChange = -10;
        break;
      case "disconnected_critical":
        ebsChange = -10;
        trustChange = -5;
        retentionChange = -15;
        break;
    }

    const newEbs = Math.max(0, Math.min(100, (currentMetrics?.emotional_bond_score || 50) + ebsChange));
    const newTrust = Math.max(0, Math.min(100, (currentMetrics?.trust_index || 50) + trustChange));
    const newRetention = Math.max(0, Math.min(100, (currentMetrics?.retention_probability || 50) + retentionChange));

    // Actualizar historial
    const now = new Date().toISOString();
    const ebsHistory = [...(currentMetrics?.ebs_history || []), { value: newEbs, date: now }].slice(-30);
    const trustHistory = [...(currentMetrics?.trust_history || []), { value: newTrust, date: now }].slice(-30);
    const retentionHistory = [...(currentMetrics?.retention_history || []), { value: newRetention, date: now }].slice(-30);

    const { error } = await supabase
      .from("user_emotional_metrics")
      .upsert({
        professional_id: professionalId,
        emotional_bond_score: newEbs,
        trust_index: newTrust,
        retention_probability: newRetention,
        ebs_history: ebsHistory,
        trust_history: trustHistory,
        retention_history: retentionHistory,
        updated_at: now,
      }, { onConflict: "professional_id" });

    if (error) {
      console.error("[LOVABLE] Error updating metrics:", error);
    }
  } catch (err) {
    console.error("[LOVABLE] Error in updateEmotionalMetrics:", err);
  }
}

async function logInteraction(
  supabase: any,
  professionalId: string,
  stateBefore: string | null,
  stateAfter: string,
  actionTaken: string,
  rewardId: string | null,
  messageId: string | null
) {
  try {
    await supabase.from("lovable_interactions").insert({
      professional_id: professionalId,
      interaction_type: "state_classification",
      emotional_state_before: stateBefore,
      emotional_state_after: stateAfter,
      action_taken: actionTaken,
      reward_id: rewardId,
      message_content: messageId ? `message_id:${messageId}` : null,
      outcome: "pending",
    });
  } catch (err) {
    console.error("[LOVABLE] Error logging interaction:", err);
  }
}
