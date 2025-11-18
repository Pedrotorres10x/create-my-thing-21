import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BehaviorAnalysisRequest {
  professionalId: string;
}

interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { professionalId }: BehaviorAnalysisRequest = await req.json();

    console.log('Analyzing behavior for professional:', professionalId);

    // Obtener eventos de las últimas 24 horas
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentEvents, error: eventsError } = await supabase
      .from('user_behavior_events')
      .select('*')
      .eq('professional_id', professionalId)
      .gte('created_at', last24h)
      .order('created_at', { ascending: false });

    if (eventsError) throw eventsError;

    const riskFactors: RiskFactor[] = [];
    let totalRiskScore = 0;

    // Análisis 1: Actividad excesiva de contactos
    const contactEvents = (recentEvents || []).filter(e => e.event_type === 'offer_contact');
    if (contactEvents.length > 15) {
      const factor: RiskFactor = {
        type: 'excessive_contacts',
        severity: 'high',
        description: `${contactEvents.length} contactos en 24h (normal: <10)`,
        score: 30,
      };
      riskFactors.push(factor);
      totalRiskScore += factor.score;
    } else if (contactEvents.length > 10) {
      const factor: RiskFactor = {
        type: 'high_contacts',
        severity: 'medium',
        description: `${contactEvents.length} contactos en 24h`,
        score: 15,
      };
      riskFactors.push(factor);
      totalRiskScore += factor.score;
    }

    // Análisis 2: Mensajería rápida sospechosa
    const rapidMessages = (recentEvents || []).filter(e => e.event_type === 'rapid_messaging');
    if (rapidMessages.length > 5) {
      const factor: RiskFactor = {
        type: 'rapid_messaging',
        severity: 'high',
        description: 'Patrón de mensajería muy rápida detectado',
        score: 25,
      };
      riskFactors.push(factor);
      totalRiskScore += factor.score;
    }

    // Análisis 3: Compartir información de contacto frecuentemente
    const contactInfoShared = (recentEvents || []).filter(e => e.event_type === 'contact_info_shared');
    if (contactInfoShared.length > 8) {
      const factor: RiskFactor = {
        type: 'frequent_contact_sharing',
        severity: 'high',
        description: `Información de contacto compartida ${contactInfoShared.length} veces`,
        score: 35,
      };
      riskFactors.push(factor);
      totalRiskScore += factor.score;
    } else if (contactInfoShared.length > 5) {
      const factor: RiskFactor = {
        type: 'contact_sharing',
        severity: 'medium',
        description: 'Compartir información de contacto frecuente',
        score: 20,
      };
      riskFactors.push(factor);
      totalRiskScore += factor.score;
    }

    // Análisis 4: Enlaces externos compartidos
    const externalLinks = (recentEvents || []).filter(e => e.event_type === 'external_link_shared');
    if (externalLinks.length > 5) {
      const factor: RiskFactor = {
        type: 'external_links',
        severity: 'medium',
        description: 'Enlaces externos compartidos repetidamente',
        score: 20,
      };
      riskFactors.push(factor);
      totalRiskScore += factor.score;
    }

    // Análisis 5: Secuencia sospechosa (precio -> contacto inmediato)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: weekEvents, error: weekError } = await supabase
      .from('user_behavior_events')
      .select('*')
      .eq('professional_id', professionalId)
      .gte('created_at', last7Days)
      .order('created_at', { ascending: true });

    if (weekError) throw weekError;

    let suspiciousSequences = 0;
    for (let i = 0; i < (weekEvents || []).length - 1; i++) {
      const current = weekEvents![i];
      const next = weekEvents![i + 1];
      
      // Detectar: discusión de precio seguida rápidamente de compartir contacto
      if (current.event_type === 'price_discussed' && 
          next.event_type === 'contact_info_shared') {
        const timeDiff = new Date(next.created_at).getTime() - new Date(current.created_at).getTime();
        if (timeDiff < 5 * 60 * 1000) { // Menos de 5 minutos
          suspiciousSequences++;
        }
      }
    }

    if (suspiciousSequences > 3) {
      const factor: RiskFactor = {
        type: 'suspicious_sequence',
        severity: 'high',
        description: `${suspiciousSequences} secuencias sospechosas: precio → contacto inmediato`,
        score: 40,
      };
      riskFactors.push(factor);
      totalRiskScore += factor.score;
    }

    // Limitar score máximo a 100
    totalRiskScore = Math.min(totalRiskScore, 100);

    // Guardar/actualizar risk score
    const { error: upsertError } = await supabase
      .from('behavioral_risk_scores')
      .upsert({
        professional_id: professionalId,
        overall_risk_score: totalRiskScore,
        risk_factors: riskFactors,
        last_updated: new Date().toISOString(),
        alert_threshold_reached: totalRiskScore >= 60,
        last_alert_sent: totalRiskScore >= 60 ? new Date().toISOString() : null,
      }, {
        onConflict: 'professional_id',
      });

    if (upsertError) {
      console.error('Error updating risk score:', upsertError);
    }

    // Si supera el umbral, crear violación
    if (totalRiskScore >= 60 && riskFactors.length > 0) {
      const { error: violationError } = await supabase
        .from('moderation_violations')
        .insert({
          professional_id: professionalId,
          violation_type: 'payment_evasion_attempt',
          severity: totalRiskScore >= 80 ? 'high' : 'medium',
          reason: `Comportamiento sospechoso detectado automáticamente`,
          categories: riskFactors.map(f => f.type),
          content_context: `Análisis de comportamiento - Score: ${totalRiskScore}/100`,
          auto_detected: true,
          detection_confidence: totalRiskScore,
          blocked: false,
        });

      if (violationError) {
        console.error('Error creating violation:', violationError);
      }
    }

    return new Response(
      JSON.stringify({
        professionalId,
        riskScore: totalRiskScore,
        riskFactors,
        alertTriggered: totalRiskScore >= 60,
        eventsAnalyzed: (recentEvents || []).length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in analyze-behavior:', error);
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
