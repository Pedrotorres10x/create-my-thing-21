import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const suggestionsRequestSchema = z.object({
  professionalId: z.string().uuid()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const validationResult = suggestionsRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input',
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { professionalId } = validationResult.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    console.log('Generating suggestions for professional:', professionalId);

    // 1. Obtener datos del profesional con detalles completos
    const { data: professionalDetails, error: detailsError } = await supabase
      .from('professionals')
      .select(`
        *,
        chapters!chapter_id(member_count)
      `)
      .eq('id', professionalId)
      .single();

    if (detailsError) {
      console.error('Error fetching professional:', detailsError);
      throw detailsError;
    }

    // 2. Calcular objetivos semanales
    const { data: goalsData, error: goalsError } = await supabase
      .rpc('calculate_user_weekly_goals', {
        p_professional_id: professionalId
      });

    if (goalsError) {
      console.error('Error calculating goals:', goalsError);
      throw goalsError;
    }

    const goals = goalsData && goalsData.length > 0 ? goalsData[0] : null;

    // 3. Analizar actividad reciente
    const { data: activity, error: activityError } = await supabase
      .from('user_activity_tracking')
      .select('*')
      .eq('professional_id', professionalId)
      .single();

    if (activityError && activityError.code !== 'PGRST116') {
      console.error('Error fetching activity:', activityError);
    }

    // 4. Generar sugerencias priorizadas
    const suggestions = [];
    const chapterMemberCount = professionalDetails?.chapters?.member_count || 0;
    const hasCompanions = chapterMemberCount > 1;

    if (goals) {
      // If no companions, priority is ALWAYS invite — never suggest referrals
      if (!hasCompanions) {
        suggestions.push({
          type: 'important',
          priority: 1,
          title: 'Invita a tu primer compañero',
          description: 'Sin compañeros en tu Tribu, no puedes intercambiar referencias. Invita a un profesional de tu círculo.',
          action: 'Invitar profesional',
          actionRoute: '/referrals',
        });
      }

      // Only suggest referrals if there are companions
      if (goals.referrals_this_week === 0 && goals.days_until_week_end <= 3 && hasCompanions) {
        suggestions.push({
          type: goals.days_until_week_end <= 1 ? 'urgent' : 'important',
          priority: 1,
          title: goals.days_until_week_end <= 1 ? '¡Refiere un contacto HOY!' : 'Refiere un contacto esta semana',
          description: `Piensa en tu círculo: ¿alguien necesita un servicio de tus compañeros? Quedan ${goals.days_until_week_end} días.`,
          action: 'Referir ahora',
          actionRoute: '/referrals',
          deadline: `Quedan ${goals.days_until_week_end} días`
        });
      }

      // Reunión mensual — only if has companions
      if (goals.meetings_this_month === 0 && goals.days_until_month_end <= 7 && hasCompanions) {
        suggestions.push({
          type: 'urgent',
          priority: 2,
          title: 'Agenda un Cara a Cara este mes',
          description: `Conocer mejor a tus compañeros = más referencias. Quedan ${goals.days_until_month_end} días.`,
          action: 'Agendar reunión',
          actionRoute: '/meetings',
          deadline: `Quedan ${goals.days_until_month_end} días`
        });
      }

      // Capítulo pequeño
      if (chapterMemberCount < 25 && hasCompanions) {
        suggestions.push({
          type: 'important',
          priority: 3,
          title: 'Ayuda a crecer tu Tribu',
          description: `Tu Tribu tiene ${chapterMemberCount}/25 miembros. Más profesiones = más intercambio.`,
          action: 'Ver Tribu',
          actionRoute: '/chapter'
        });
      }

      // Engagement
      if (goals.posts_this_week === 0 && goals.comments_this_week === 0) {
        suggestions.push({
          type: 'recommended',
          priority: 4,
          title: 'Hazte visible en La Fogata',
          description: 'Los que publican reciben más referencias.',
          action: 'Ir a La Fogata',
          actionRoute: '/feed'
        });
      }
    }

    console.log('Generated suggestions:', suggestions);

    return new Response(
      JSON.stringify({ 
        suggestions: suggestions.slice(0, 3),
        goals,
        activity 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-smart-suggestions:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
