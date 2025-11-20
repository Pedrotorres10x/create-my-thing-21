import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting reactivated users reward process...");

    // Find users who were dormant/inactive but are now active again
    const { data: reactivatedUsers, error: fetchError } = await supabase
      .from('user_activity_tracking')
      .select(`
        professional_id,
        reengagement_stage,
        inactivity_days,
        activity_score,
        professionals (
          id,
          full_name,
          email,
          total_points,
          status
        )
      `)
      .eq('reengagement_stage', 'active')
      .gte('activity_score', 60)
      .lte('inactivity_days', 7);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${reactivatedUsers?.length || 0} potentially reactivated users`);

    const results = {
      rewarded: 0,
      skipped: 0,
      errors: 0
    };

    for (const user of reactivatedUsers || []) {
      try {
        const professional = user.professionals as any;
        
        if (!professional || professional.status !== 'approved') {
          results.skipped++;
          continue;
        }

        // Check if they've received a reactivation bonus in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentBonus } = await supabase
          .from('point_transactions')
          .select('id')
          .eq('professional_id', professional.id)
          .eq('reason', 'Reactivation Bonus')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .maybeSingle();

        if (recentBonus) {
          console.log(`User ${professional.email} already received bonus recently`);
          results.skipped++;
          continue;
        }

        // Determine bonus based on activity score
        let bonusPoints = 50; // Base bonus
        let bonusMessage = "¡Bienvenido de vuelta! Bonus de reactivación";

        if (user.activity_score >= 80) {
          bonusPoints = 150;
          bonusMessage = "¡Increíble comeback! Bonus premium de reactivación";
        } else if (user.activity_score >= 70) {
          bonusPoints = 100;
          bonusMessage = "¡Gran regreso! Bonus especial de reactivación";
        }

        // Award bonus points
        const { error: pointsError } = await supabase
          .from('point_transactions')
          .insert({
            professional_id: professional.id,
            points: bonusPoints,
            reason: 'Reactivation Bonus'
          });

        if (pointsError) {
          throw pointsError;
        }

        // Update total points
        const { error: updateError } = await supabase
          .from('professionals')
          .update({
            total_points: professional.total_points + bonusPoints
          })
          .eq('id', professional.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`Rewarded ${professional.email} with ${bonusPoints} points`);
        results.rewarded++;

        // Optional: Send notification email
        // This would require Resend integration similar to send-reengagement-notifications

      } catch (error) {
        console.error(`Error processing user ${user.professional_id}:`, error);
        results.errors++;
      }
    }

    console.log("Reactivation rewards process completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Rewarded ${results.rewarded} reactivated users`
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error("Error in reward-reactivated-users function:", error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred processing your request',
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
