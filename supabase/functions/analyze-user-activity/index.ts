import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

    console.log('Starting daily activity analysis...');

    // Obtener todos los profesionales activos con plan freemium
    const { data: professionals, error: profError } = await supabase
      .from('professionals')
      .select('id, full_name, email, total_points, subscription_plan_id')
      .eq('status', 'approved')
      .eq('moderation_blocked', false);

    if (profError) throw profError;

    console.log(`Analyzing ${professionals?.length || 0} professionals`);

    const results = {
      analyzed: 0,
      needsAttention: [] as any[],
      stageChanges: [] as any[],
    };

    for (const prof of professionals || []) {
      try {
        // Calcular activity score usando función de DB
        const { data: scoreData, error: scoreError } = await supabase
          .rpc('calculate_activity_score', { _professional_id: prof.id });

        if (scoreError) {
          console.error(`Error calculating score for ${prof.id}:`, scoreError);
          continue;
        }

        const activityScore = scoreData || 0;

        // Obtener datos actuales de tracking
        const { data: tracking, error: trackingError } = await supabase
          .from('user_activity_tracking')
          .select('*')
          .eq('professional_id', prof.id)
          .single();

        // Calcular días de inactividad basado en last_login
        const lastLogin = tracking?.last_login ? new Date(tracking.last_login) : null;
        const inactivityDays = lastLogin 
          ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Determinar stage usando función de DB
        const { data: newStage, error: stageError } = await supabase
          .rpc('determine_reengagement_stage', {
            _activity_score: activityScore,
            _inactivity_days: inactivityDays,
          });

        if (stageError) {
          console.error(`Error determining stage for ${prof.id}:`, stageError);
          continue;
        }

        const oldStage = tracking?.reengagement_stage || 'active';

        // Actualizar o insertar tracking
        const { error: upsertError } = await supabase
          .from('user_activity_tracking')
          .upsert({
            professional_id: prof.id,
            activity_score: activityScore,
            inactivity_days: inactivityDays,
            reengagement_stage: newStage,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'professional_id',
          });

        if (upsertError) {
          console.error(`Error upserting tracking for ${prof.id}:`, upsertError);
          continue;
        }

        results.analyzed++;

        // Detectar cambios de stage
        if (oldStage !== newStage) {
          results.stageChanges.push({
            professionalId: prof.id,
            name: prof.full_name,
            email: prof.email,
            oldStage,
            newStage,
            inactivityDays,
          });

          console.log(`Stage change: ${prof.full_name} ${oldStage} → ${newStage}`);
        }

        // Marcar usuarios que necesitan atención urgente
        if (['inactive', 'dormant'].includes(newStage)) {
          results.needsAttention.push({
            professionalId: prof.id,
            name: prof.full_name,
            email: prof.email,
            stage: newStage,
            inactivityDays,
            totalPoints: prof.total_points,
          });
        }

      } catch (profError) {
        console.error(`Error processing professional ${prof.id}:`, profError);
      }
    }

    // Ordenar usuarios que necesitan atención por puntos (usuarios más valiosos primero)
    results.needsAttention.sort((a, b) => b.totalPoints - a.totalPoints);

    console.log('Analysis complete:', {
      analyzed: results.analyzed,
      needsAttention: results.needsAttention.length,
      stageChanges: results.stageChanges.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in analyze-user-activity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
