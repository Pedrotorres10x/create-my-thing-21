import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (user_id === user.id) {
      return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the professional record first
    const { data: professional } = await supabaseAdmin
      .from("professionals")
      .select("id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (professional) {
      const profId = professional.id;

      // Delete all related records that have FK to professionals
      // Order matters: delete children before parent
      const relatedTables = [
        { table: "chat_messages", via: "conversation_id", subquery: true },
        { table: "chat_conversations", column: "professional_id" },
        { table: "lovable_messages", column: "professional_id" },
        { table: "lovable_interactions", column: "professional_id" },
        { table: "point_transactions", column: "professional_id" },
        { table: "professional_badges", column: "professional_id" },
        { table: "user_penalties", column: "professional_id" },
        { table: "penalty_appeals", column: "professional_id" },
        { table: "inactivity_warnings", column: "professional_id" },
        { table: "user_activity_tracking", column: "professional_id" },
        { table: "user_weekly_goals", column: "professional_id" },
        { table: "user_micro_rewards", column: "professional_id" },
        { table: "behavioral_risk_scores", column: "professional_id" },
        { table: "moderation_violations", column: "professional_id" },
        { table: "post_likes", column: "professional_id" },
        { table: "post_comments", column: "professional_id" },
        { table: "posts", column: "professional_id" },
        { table: "offer_contacts", column: "interested_professional_id" },
        { table: "offers", column: "professional_id" },
        { table: "sphere_internal_references", column: "referrer_id" },
        { table: "sphere_internal_references", column: "referred_to_id" },
        { table: "sphere_project_participants", column: "professional_id" },
        { table: "meetings", column: "requester_id" },
        { table: "meetings", column: "recipient_id" },
        { table: "referrals", column: "referrer_id" },
        { table: "referrals", column: "referred_id" },
        { table: "deals", column: "referrer_id" },
        { table: "deals", column: "receiver_id" },
        { table: "user_reports", column: "reporter_id" },
        { table: "user_reports", column: "reported_id" },
        { table: "banner_clicks", column: "professional_id" },
        { table: "banner_impressions", column: "professional_id" },
        { table: "marketplace_waitlist", column: "professional_id" },
        { table: "chapter_specialization_waitlist", column: "professional_id" },
        { table: "cross_chapter_requests", column: "requester_id" },
      ];

      // First delete chat_messages via conversation_id
      const { data: convos } = await supabaseAdmin
        .from("chat_conversations")
        .select("id")
        .eq("professional_id", profId);
      
      if (convos && convos.length > 0) {
        const convoIds = convos.map(c => c.id);
        await supabaseAdmin.from("chat_messages").delete().in("conversation_id", convoIds);
      }

      // Nullify chapters.leader_id referencing this professional
      await supabaseAdmin.from("chapters").update({ leader_id: null }).eq("leader_id", profId);

      // Delete from all related tables
      for (const rel of relatedTables) {
        if (rel.subquery) continue; // Already handled above
        try {
          await supabaseAdmin.from(rel.table).delete().eq(rel.column!, profId);
        } catch (e) {
          console.log(`Note: could not clean ${rel.table}.${rel.column}: ${e.message}`);
        }
      }

      // Nullify committee_rotations member references
      for (const col of ["member_1_id", "member_2_id", "member_3_id"]) {
        await supabaseAdmin.from("committee_rotations").update({ [col]: null }).eq(col, profId);
      }

      // Nullify other nullable FK references
      await supabaseAdmin.from("cross_chapter_requests").update({ matched_professional_id: null }).eq("matched_professional_id", profId);
      await supabaseAdmin.from("ethics_committee_decisions").update({ reviewed_by: null }).eq("reviewed_by", profId);
      await supabaseAdmin.from("deal_disagreements").update({ resolved_by: null }).eq("resolved_by", profId);

      // Delete user_roles
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);

      // Finally delete the professional record
      await supabaseAdmin.from("professionals").delete().eq("id", profId);
    }

    // Delete the user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return new Response(JSON.stringify({ error: "Database error deleting user", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
