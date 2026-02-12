import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/*
  Cron job: process-expulsion-votes
  Runs daily to:
  1. Check expulsion_reviews where auto_expire_at has passed → auto-expel
  2. Send reminders to committee members who haven't voted after 48h
*/

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    let autoExpulsions = 0;
    let remindersSent = 0;

    // 1. Find expired pending reviews (7 days passed, no majority)
    const { data: expiredReviews, error: expiredError } = await supabase
      .from("expulsion_reviews")
      .select("*, professional:professionals!expulsion_reviews_professional_id_fkey(id, full_name, expulsion_count)")
      .eq("status", "pending")
      .lt("auto_expire_at", now.toISOString());

    if (expiredError) throw expiredError;

    for (const review of (expiredReviews || [])) {
      const prof = review.professional;
      if (!prof) continue;

      const newCount = (prof.expulsion_count || 0) + 1;
      const newStatus = newCount >= 2 ? "banned" : "inactive";

      // Execute auto-expulsion
      await supabase
        .from("professionals")
        .update({
          status: newStatus,
          expulsion_count: newCount,
          last_expulsion_at: now.toISOString(),
        })
        .eq("id", prof.id);

      // Mark review as auto_expired
      await supabase
        .from("expulsion_reviews")
        .update({
          status: "auto_expired",
          decided_at: now.toISOString(),
        })
        .eq("id", review.id);

      // Notify the expelled user
      await supabase.from("lovable_messages").insert({
        professional_id: prof.id,
        title: "Cuenta desactivada por inactividad",
        content: newCount >= 2
          ? "Tu cuenta ha sido suspendida permanentemente tras tu segunda expulsión por inactividad."
          : "Tu cuenta ha sido desactivada por inactividad. El Consejo no emitió un veredicto a tiempo. Podrás solicitar reentrada en 6 meses.",
        message_type: "critical",
        tone: "urgent",
        trigger_state: "expulsion",
      });

      autoExpulsions++;
    }

    // 2. Send reminders to committee members who haven't voted (reviews older than 48h)
    const reminderThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const { data: pendingReviews } = await supabase
      .from("expulsion_reviews")
      .select("id, professional_id, trigger_details, created_at")
      .eq("status", "pending")
      .lt("created_at", reminderThreshold);

    if (pendingReviews && pendingReviews.length > 0) {
      const { data: committeeMembers } = await supabase.rpc("get_ethics_committee_members");

      for (const review of pendingReviews) {
        // Find who hasn't voted
        const { data: votes } = await supabase
          .from("expulsion_votes")
          .select("voter_id")
          .eq("review_id", review.id);

        const voterIds = new Set((votes || []).map((v: any) => v.voter_id));

        for (const member of (committeeMembers || [])) {
          if (voterIds.has(member.id)) continue; // Already voted

          const details = review.trigger_details as any;
          await supabase.from("lovable_messages").insert({
            professional_id: member.id,
            title: "Recordatorio: voto pendiente en El Consejo",
            content: `Tienes un caso de expulsión sin votar: ${details?.full_name || 'Usuario'}. Tu voto es necesario antes de que expire automáticamente.`,
            message_type: "warning",
            tone: "urgent",
            trigger_state: "council_reminder",
          });

          try {
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                professionalId: member.id,
                title: "⏰ Voto pendiente en El Consejo",
                body: `Caso sin resolver. Tu voto es necesario.`,
                url: "/ethics-committee",
              }),
            });
          } catch {
            // Best-effort
          }

          remindersSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Process complete. ${autoExpulsions} auto-expulsions, ${remindersSent} reminders sent.`,
        auto_expulsions: autoExpulsions,
        reminders_sent: remindersSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process expulsion votes error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
