import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all approved professionals with activity data
    const { data: professionals, error: profError } = await supabase
      .from("professionals")
      .select("id, full_name, email, created_at, deals_completed, total_deal_value, chapter_id")
      .eq("status", "approved");

    if (profError) throw profError;
    if (!professionals || professionals.length === 0) {
      return new Response(JSON.stringify({ message: "No professionals to analyze" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const alerts: any[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const prof of professionals) {
      // Skip very new members (< 30 days)
      if (new Date(prof.created_at) > thirtyDaysAgo) continue;

      // Check for existing pending alerts to avoid duplicates
      const { data: existingAlerts } = await supabase
        .from("red_flag_alerts")
        .select("id, alert_type")
        .eq("professional_id", prof.id)
        .eq("status", "pending");

      const existingTypes = new Set((existingAlerts || []).map((a: any) => a.alert_type));

      // 1. Referrals received but no deals closed
      const { data: dealsReceived } = await supabase
        .from("deals")
        .select("id, status, created_at")
        .eq("receiver_id", prof.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      const { data: dealsClosed } = await supabase
        .from("deals")
        .select("id")
        .eq("receiver_id", prof.id)
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const receivedCount = dealsReceived?.length || 0;
      const closedCount = dealsClosed?.length || 0;

      if (receivedCount >= 3 && closedCount === 0 && !existingTypes.has("referrals_no_deals")) {
        alerts.push({
          professional_id: prof.id,
          alert_type: "referrals_no_deals",
          evidence: {
            referrals_received_30d: receivedCount,
            deals_closed_30d: closedCount,
            professional_name: prof.full_name,
            period: "30 days",
          },
        });
      }

      // 2. Many meetings but no deals
      const { data: meetings } = await supabase
        .from("meetings")
        .select("id, status")
        .or(`requester_id.eq.${prof.id},recipient_id.eq.${prof.id}`)
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const meetingCount = meetings?.length || 0;

      if (meetingCount >= 5 && closedCount === 0 && !existingTypes.has("meetings_no_activity")) {
        alerts.push({
          professional_id: prof.id,
          alert_type: "meetings_no_activity",
          evidence: {
            completed_meetings_30d: meetingCount,
            deals_closed_30d: closedCount,
            professional_name: prof.full_name,
            period: "30 days",
          },
        });
      }

      // 3. Ratio imbalance (receives much more than gives)
      const { data: dealsGiven } = await supabase
        .from("deals")
        .select("id")
        .eq("referrer_id", prof.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      const givenCount = dealsGiven?.length || 0;

      if (receivedCount >= 4 && givenCount === 0 && !existingTypes.has("ratio_imbalance")) {
        alerts.push({
          professional_id: prof.id,
          alert_type: "ratio_imbalance",
          evidence: {
            referrals_received_30d: receivedCount,
            referrals_given_30d: givenCount,
            ratio: receivedCount > 0 && givenCount === 0 ? "∞" : (receivedCount / Math.max(givenCount, 1)).toFixed(1),
            professional_name: prof.full_name,
            period: "30 days",
          },
        });
      }

      // 4. Inactivity post-referral (received referral then disappeared)
      if (receivedCount > 0) {
        const lastReferral = dealsReceived!.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        const daysSinceLastReferral = Math.floor(
          (now.getTime() - new Date(lastReferral.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check last login/activity (posts, comments, meetings created)
        const { data: recentPosts } = await supabase
          .from("posts")
          .select("id")
          .eq("professional_id", prof.id)
          .gte("created_at", lastReferral.created_at);

        const { data: recentComments } = await supabase
          .from("post_comments")
          .select("id")
          .eq("professional_id", prof.id)
          .gte("created_at", lastReferral.created_at);

        const activityAfterReferral = (recentPosts?.length || 0) + (recentComments?.length || 0);

        if (
          daysSinceLastReferral >= 7 &&
          activityAfterReferral === 0 &&
          lastReferral.status !== "completed" &&
          !existingTypes.has("inactivity_post_referral")
        ) {
          alerts.push({
            professional_id: prof.id,
            alert_type: "inactivity_post_referral",
            evidence: {
              days_inactive_since_referral: daysSinceLastReferral,
              last_referral_date: lastReferral.created_at,
              activity_after_referral: activityAfterReferral,
              professional_name: prof.full_name,
            },
          });
        }
      }
    }

    // Now use AI to analyze each alert and assign severity + analysis
    if (alerts.length > 0) {
      const aiPrompt = `Eres un analista de fraude para CONECTOR, una plataforma de generación de negocio entre profesionales.
Analiza estas señales sospechosas de usuarios que podrían estar recibiendo referidos de negocio a través de la plataforma pero cerrando tratos por fuera sin reportarlos.

Esto desnaturaliza el sistema: sin registro, no hay puntos, no hay rankings, no hay confianza grupal.

Para CADA alerta, devuelve un JSON con:
- severity: "low" | "medium" | "high" | "critical"
- confidence: 0-100 (qué tan seguro estás)
- analysis: Explicación clara en español de por qué es sospechoso y qué patrón detectas (max 200 palabras)

Criterios de severidad:
- low: patrón leve, podría ser casualidad
- medium: patrón claro pero podría tener explicación legítima
- high: patrón muy sospechoso, probablemente intencional
- critical: evidencia contundente de evasión sistemática

Alertas a analizar:
${JSON.stringify(alerts.map(a => ({ type: a.alert_type, evidence: a.evidence })), null, 2)}

Responde SOLO con un JSON array, uno por cada alerta, en el mismo orden.`;

      const aiResponse = await fetch("https://wpyjsqtvntdziarfipxv.supabase.co/functions/v1/conector-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          _internal_ai_call: true,
          prompt: aiPrompt,
        }),
      }).catch(() => null);

      // Fallback: if AI call fails, use heuristic scoring
      let aiResults: any[] = [];

      if (aiResponse && aiResponse.ok) {
        try {
          const text = await aiResponse.text();
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            aiResults = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // AI parse failed, use heuristics
        }
      }

      // Insert alerts with AI analysis or heuristic fallback
      for (let i = 0; i < alerts.length; i++) {
        const alert = alerts[i];
        const ai = aiResults[i] || null;

        const severity = ai?.severity || getHeuristicSeverity(alert);
        const confidence = ai?.confidence || getHeuristicConfidence(alert);
        const analysis = ai?.analysis || getHeuristicAnalysis(alert);

        await supabase.from("red_flag_alerts").insert({
          professional_id: alert.professional_id,
          alert_type: alert.alert_type,
          severity,
          ai_confidence: confidence,
          ai_analysis: analysis,
          evidence: alert.evidence,
          status: "pending",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Analysis complete. ${alerts.length} new alerts generated.`,
        alerts_count: alerts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Red flag analysis error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getHeuristicSeverity(alert: any): string {
  switch (alert.alert_type) {
    case "referrals_no_deals":
      return alert.evidence.referrals_received_30d >= 5 ? "high" : "medium";
    case "meetings_no_activity":
      return alert.evidence.completed_meetings_30d >= 8 ? "high" : "medium";
    case "ratio_imbalance":
      return alert.evidence.referrals_received_30d >= 6 ? "critical" : "high";
    case "inactivity_post_referral":
      return alert.evidence.days_inactive_since_referral >= 14 ? "high" : "medium";
    default:
      return "medium";
  }
}

function getHeuristicConfidence(alert: any): number {
  switch (alert.alert_type) {
    case "referrals_no_deals":
      return Math.min(90, 50 + alert.evidence.referrals_received_30d * 8);
    case "meetings_no_activity":
      return Math.min(85, 40 + alert.evidence.completed_meetings_30d * 7);
    case "ratio_imbalance":
      return Math.min(95, 60 + alert.evidence.referrals_received_30d * 5);
    case "inactivity_post_referral":
      return Math.min(80, 45 + alert.evidence.days_inactive_since_referral * 2);
    default:
      return 50;
  }
}

function getHeuristicAnalysis(alert: any): string {
  const name = alert.evidence.professional_name;
  switch (alert.alert_type) {
    case "referrals_no_deals":
      return `${name} ha recibido ${alert.evidence.referrals_received_30d} referidos en los últimos 30 días pero no ha cerrado ningún deal en la plataforma. Esto sugiere que podría estar cerrando acuerdos fuera del sistema, evitando el registro y beneficiándose de la red sin contribuir a la trazabilidad.`;
    case "meetings_no_activity":
      return `${name} ha completado ${alert.evidence.completed_meetings_30d} reuniones Cara a Cara en 30 días sin generar ningún deal posterior. Un volumen alto de meetings sin resultados registrados es un indicador de que la actividad comercial podría estar ocurriendo fuera de la plataforma.`;
    case "ratio_imbalance":
      return `${name} muestra un desequilibrio severo: ha recibido ${alert.evidence.referrals_received_30d} referidos pero ha dado ${alert.evidence.referrals_given_30d}. Este patrón de "solo recibir" indica que se beneficia de la red sin reciprocidad, violando el principio fundamental de Givers Gain.`;
    case "inactivity_post_referral":
      return `${name} desapareció de la plataforma ${alert.evidence.days_inactive_since_referral} días después de recibir su último referido. La inactividad total post-referido sugiere que gestionó el contacto fuera de la app y perdió incentivo para seguir participando.`;
    default:
      return "Patrón sospechoso detectado que requiere revisión manual.";
  }
}
