import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const analysisRequestSchema = z.object({
  text: z.string().min(1).max(10000),
  context: z.string().max(200),
  professionalId: z.string().uuid(),
  contextId: z.string().optional()
});

interface AnalysisRequest {
  text: string;
  context: string; // 'offer_description', 'contact_message', 'direct_message'
  professionalId: string;
  contextId?: string; // ID de la oferta, mensaje, etc.
}

interface DetectionResult {
  isHighRisk: boolean;
  riskScore: number; // 0-100
  detectedPatterns: string[];
  reasoning: string;
  suggestedAction: 'none' | 'warn' | 'flag' | 'block';
}

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
    const validationResult = analysisRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input',
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { text, context, professionalId, contextId } = validationResult.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Analyzing content for payment evasion:', { context, professionalId, textLength: text.length });

    // Análisis con IA
    const aiAnalysis = await analyzeWithAI(text, context, lovableApiKey);
    
    console.log('AI Analysis result:', aiAnalysis);

    // Si es alto riesgo, registrar violación
    if (aiAnalysis.isHighRisk) {
      const { error: violationError } = await supabase
        .from('moderation_violations')
        .insert({
          professional_id: professionalId,
          user_id: null,
          violation_type: 'payment_evasion_attempt',
          severity: aiAnalysis.riskScore > 80 ? 'high' : 'medium',
          reason: aiAnalysis.reasoning,
          categories: aiAnalysis.detectedPatterns,
          content_context: `${context}${contextId ? ` (ID: ${contextId})` : ''}`,
          blocked: false,
        });

      if (violationError) {
        console.error('Error creating violation record:', violationError);
      }

      // Si es muy alto riesgo (>80), crear penalización automática
      if (aiAnalysis.riskScore > 80) {
        const { error: penaltyError } = await supabase
          .from('user_penalties')
          .insert({
            professional_id: professionalId,
            penalty_type: 'warning',
            severity: 'high',
            reason: `Detección automática: ${aiAnalysis.reasoning}`,
            points_deducted: 50,
          });

        if (penaltyError) {
          console.error('Error creating penalty:', penaltyError);
        }

        // Deducir puntos
        const { error: deductError } = await supabase.rpc('deduct_points', {
          prof_id: professionalId,
          points: 50,
        });
        
        if (deductError) {
          console.error('Error deducting points:', deductError);
        }
      }
    }

    return new Response(
      JSON.stringify(aiAnalysis),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in detect-payment-evasion:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function analyzeWithAI(
  text: string, 
  context: string,
  apiKey: string
): Promise<DetectionResult> {
  const systemPrompt = `Eres un experto detector de fraude en plataformas de servicios profesionales. Tu trabajo es analizar textos para detectar intentos de evadir comisiones mediante pagos externos.

PATRONES SOSPECHOSOS A DETECTAR:
- Menciones de pagos directos, transferencias fuera de la plataforma
- Referencias a métodos de pago externos: "Bizum", "PayPal", "transferencia", "efectivo", "cash"
- Frases como: "pago directo", "sin comisión", "fuera de la app", "mejor precio si...", "te cobro menos si..."
- Compartir números de cuenta bancaria (IBAN: ES + 22 dígitos)
- Propuestas de "hablar por WhatsApp sobre el pago", "te paso mi cuenta"
- Evasión explícita: "para evitar comisiones", "sin que la plataforma se entere"

CONTEXTO: ${context}

Analiza el siguiente texto y devuelve un análisis de riesgo.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'report_payment_evasion_risk',
            description: 'Reporta el nivel de riesgo de intento de evasión de pago',
            parameters: {
              type: 'object',
              properties: {
                isHighRisk: {
                  type: 'boolean',
                  description: 'true si hay evidencia clara de intento de evasión'
                },
                riskScore: {
                  type: 'number',
                  description: 'Score de 0-100 indicando nivel de riesgo',
                  minimum: 0,
                  maximum: 100
                },
                detectedPatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Lista de patrones sospechosos detectados'
                },
                reasoning: {
                  type: 'string',
                  description: 'Explicación breve (max 200 caracteres) de por qué es sospechoso'
                },
                suggestedAction: {
                  type: 'string',
                  enum: ['none', 'warn', 'flag', 'block'],
                  description: 'Acción recomendada: none (0-30), warn (31-60), flag (61-80), block (81-100)'
                }
              },
              required: ['isHighRisk', 'riskScore', 'detectedPatterns', 'reasoning', 'suggestedAction'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'report_payment_evasion_risk' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      console.warn('No tool call in AI response, returning safe default');
      return {
        isHighRisk: false,
        riskScore: 0,
        detectedPatterns: [],
        reasoning: 'No se pudo analizar el contenido',
        suggestedAction: 'none'
      };
    }

    const result = JSON.parse(toolCall.function.arguments);
    return result as DetectionResult;

  } catch (error) {
    console.error('Error calling AI API:', error);
    // En caso de error, retornar análisis básico con keywords
    return basicKeywordAnalysis(text);
  }
}

function basicKeywordAnalysis(text: string): DetectionResult {
  const normalizedText = text.toLowerCase();
  const detectedPatterns: string[] = [];
  let riskScore = 0;

  // Keywords de alto riesgo
  const highRiskKeywords = [
    { pattern: 'pago directo', points: 40 },
    { pattern: 'sin comisión', points: 50 },
    { pattern: 'fuera de la app', points: 45 },
    { pattern: 'evitar comisión', points: 60 },
    { pattern: 'transferencia bancaria', points: 30 },
    { pattern: /es\d{22}/i, points: 50 }, // IBAN español
  ];

  // Keywords de riesgo medio
  const mediumRiskKeywords = [
    { pattern: 'bizum', points: 25 },
    { pattern: 'paypal', points: 25 },
    { pattern: 'efectivo', points: 20 },
    { pattern: 'te paso mi', points: 20 },
    { pattern: 'mejor precio si', points: 30 },
    { pattern: 'hablamos por whatsapp', points: 15 },
  ];

  [...highRiskKeywords, ...mediumRiskKeywords].forEach(({ pattern, points }) => {
    const patternStr = typeof pattern === 'string' ? pattern : pattern.source;
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    
    if (regex.test(normalizedText)) {
      detectedPatterns.push(patternStr);
      riskScore += points;
    }
  });

  riskScore = Math.min(riskScore, 100);
  const isHighRisk = riskScore >= 50;

  let suggestedAction: DetectionResult['suggestedAction'] = 'none';
  if (riskScore > 80) suggestedAction = 'block';
  else if (riskScore > 60) suggestedAction = 'flag';
  else if (riskScore > 30) suggestedAction = 'warn';

  return {
    isHighRisk,
    riskScore,
    detectedPatterns,
    reasoning: detectedPatterns.length > 0
      ? `Detectados patrones sospechosos: ${detectedPatterns.slice(0, 3).join(', ')}`
      : 'No se detectaron patrones sospechosos',
    suggestedAction
  };
}
