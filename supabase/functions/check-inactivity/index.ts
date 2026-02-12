import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/*
  Progressive inactivity system:
  - 3 months without GIVING a referral → first warning
  - 4 months → second warning
  - 5 months → final warning (last chance)
  - 6 months → case sent to El Consejo (top 3 by ranking) for vote
  - El Consejo votes: expel / absolve / extend (1 month)
  - If no majority in 7 days → auto-expulsion fallback

  NOTE: "inviting" new members does NOT count as giving a referral.
  Only actual business referrals (deals where they are the referrer) count.
*/

interface WarningConfig {
  months: number;
  level: number;
  type: string;
  message: string;
}

const WARNING_STAGES: WarningConfig[] = [
  {
    months: 3,
    level: 1,
    type: "first_warning",
    message:
      "Llevas 3 meses sin dar un referido a tu Trinchera. Recuerda que el sistema funciona con reciprocidad: cuanto más das, más recibes. Si no generas actividad en los próximos 3 meses, tu caso será revisado por El Consejo.",
  },
  {
    months: 4,
    level: 2,
    type: "second_warning",
    message:
      "Segundo aviso: llevas 4 meses sin dar referidos. Tu Trinchera te necesita activo. Te quedan 2 meses antes de que tu caso sea elevado a El Consejo.",
  },
  {
    months: 5,
    level: 3,
    type: "final_warning",
    message:
      "⚠️ ÚLTIMO AVISO: Llevas 5 meses sin dar ningún referido. Si en 30 días no generas actividad, tu caso será enviado a El Consejo para que decidan sobre tu permanencia.",
  },
  {
    months: 6,
    level: 4,
    type: "council_review",
    message:
      "Tu caso ha sido elevado a El Consejo por inactividad prolongada (6 meses sin dar referidos). Los 3 miembros con mayor ranking decidirán sobre tu permanencia.",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    // Get all approved professionals
    const { data: professionals, error: profError } = await supabase
      .from("professionals")
      .select("id, full_name, email, created_at, status")
      .eq("status", "approved");

    if (profError) throw profError;
    if (!professionals || professionals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No professionals to check" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let warningsSent = 0;
    let councilCases = 0;

    for (const prof of professionals) {
      // Skip members who joined less than 3 months ago
      const memberSince = new Date(prof.created_at);
      const monthsSinceJoin = monthsDiff(memberSince, now);
      if (monthsSinceJoin < 3) continue;

      // Find last referral GIVEN (deals where they are the referrer)
      const { data: lastDeal } = await supabase
        .from("deals")
        .select("created_at")
        .eq("referrer_id", prof.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastReferralDate = lastDeal && lastDeal.length > 0
        ? new Date(lastDeal[0].created_at)
        : memberSince;

      const monthsInactive = monthsDiff(lastReferralDate, now);

      if (monthsInactive < 3) continue;

      // Get highest warning level already sent
      const { data: existingWarnings } = await supabase
        .from("inactivity_warnings")
        .select("warning_level, created_at")
        .eq("professional_id", prof.id)
        .order("warning_level", { ascending: false })
        .limit(1);

      const highestLevel = existingWarnings && existingWarnings.length > 0
        ? existingWarnings[0].warning_level
        : 0;

      // Determine which warning to send
      const applicableStage = WARNING_STAGES
        .filter((s) => s.months <= monthsInactive && s.level > highestLevel)
        .sort((a, b) => b.level - a.level)[0];

      if (!applicableStage) continue;

      // Level 4: Send to El Consejo instead of direct expulsion
      if (applicableStage.level === 4) {
        // Check if there's already a pending review for this professional
        const { data: existingReview } = await supabase
          .from("expulsion_reviews")
          .select("id")
          .eq("professional_id", prof.id)
          .eq("status", "pending")
          .limit(1);

        if (existingReview && existingReview.length > 0) continue; // Already has pending review

        // Create expulsion review for El Consejo
        const { error: reviewError } = await supabase
          .from("expulsion_reviews")
          .insert({
            professional_id: prof.id,
            trigger_type: "inactivity",
            trigger_details: {
              months_inactive: monthsInactive,
              last_referral_at: lastDeal?.[0]?.created_at || null,
              member_since: prof.created_at,
              full_name: prof.full_name,
            },
            status: "pending",
            auto_expire_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (reviewError) {
          console.error("Error creating expulsion review:", reviewError);
          continue;
        }

        // Notify El Consejo members via Alic.ia
        const { data: committeeMembers } = await supabase.rpc("get_ethics_committee_members");

        if (committeeMembers) {
          for (const member of committeeMembers) {
            await supabase.from("lovable_messages").insert({
              professional_id: member.id,
              title: "Caso pendiente en El Consejo",
              content: `${prof.full_name} lleva ${monthsInactive} meses sin dar referidos. Tu voto es necesario para decidir su permanencia. Tienes 7 días.`,
              message_type: "critical",
              tone: "urgent",
              trigger_state: "council_review",
            });

            // Push notification
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  professionalId: member.id,
                  title: "⚖️ El Consejo te necesita",
                  body: `Caso de expulsión pendiente: ${prof.full_name}. Tu voto es necesario.`,
                  url: "/ethics-committee",
                }),
              });
            } catch {
              // Push is best-effort
            }
          }
        }

        councilCases++;
      }

      // Insert the warning
      await supabase.from("inactivity_warnings").insert({
        professional_id: prof.id,
        warning_level: applicableStage.level,
        warning_type: applicableStage.type,
        message: applicableStage.message,
        months_inactive: monthsInactive,
        last_referral_given_at: lastDeal && lastDeal.length > 0
          ? lastDeal[0].created_at
          : null,
      });

      // Alic.ia message for the affected user
      await supabase.from("lovable_messages").insert({
        professional_id: prof.id,
        title: applicableStage.level === 4
          ? "Tu caso ha sido elevado a El Consejo"
          : `Aviso de inactividad (${applicableStage.level}/3)`,
        content: applicableStage.message,
        message_type: applicableStage.level === 4 ? "critical" : "warning",
        tone: applicableStage.level >= 3 ? "urgent" : "warm",
        trigger_state: "inactivity",
      });

      // Push notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            professionalId: prof.id,
            title: applicableStage.level === 4
              ? "⚖️ Caso elevado a El Consejo"
              : `⚠️ Aviso de inactividad`,
            body: applicableStage.level === 4
              ? "Tu caso de inactividad será revisado por El Consejo."
              : `Llevas ${monthsInactive} meses sin dar referidos. ${6 - monthsInactive} meses para revisión por El Consejo.`,
            url: "/dashboard",
          }),
        });
      } catch {
        // Push is best-effort
      }

      warningsSent++;
    }

    return new Response(
      JSON.stringify({
        message: `Inactivity check complete. ${warningsSent} warnings sent, ${councilCases} cases sent to El Consejo.`,
        warnings_sent: warningsSent,
        council_cases: councilCases,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Inactivity check error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function monthsDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}
