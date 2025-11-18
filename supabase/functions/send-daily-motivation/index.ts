import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      throw new Error("Missing required API keys");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(RESEND_API_KEY);

    console.log("Starting daily motivation email job...");

    // Get motivational quote using Lovable AI
    const quoteResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en frases motivacionales de negocios y networking profesional. Proporciona solo la frase, sin comillas adicionales ni explicaciones.'
          },
          {
            role: 'user',
            content: 'Dame una frase motivacional inspiradora sobre networking, negocios o crecimiento profesional. Debe ser en español, breve (máximo 2 líneas) y motivadora.'
          }
        ],
      }),
    });

    if (!quoteResponse.ok) {
      throw new Error(`Failed to get motivational quote: ${quoteResponse.status}`);
    }

    const quoteData = await quoteResponse.json();
    const motivationalQuote = quoteData.choices[0].message.content.trim();

    console.log("Motivational quote:", motivationalQuote);

    // Get all approved professionals with their chapter info
    const { data: professionals, error: profError } = await supabase
      .from('professionals')
      .select(`
        id,
        email,
        full_name,
        chapter_id
      `)
      .eq('status', 'approved');

    if (profError) {
      throw new Error(`Error fetching professionals: ${profError.message}`);
    }

    if (!professionals || professionals.length === 0) {
      console.log("No approved professionals found");
      return new Response(JSON.stringify({ message: "No users to email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${professionals.length} professionals to email`);

    // Send emails to each professional with personalized reminder
    const emailPromises = professionals.map(async (prof) => {
      try {
        // Get chapter member count if user has a chapter
        let chapterMemberCount = 0;
        if (prof.chapter_id) {
          const { data: chapterData } = await supabase
            .from('chapters')
            .select('member_count')
            .eq('id', prof.chapter_id)
            .single();
          
          chapterMemberCount = chapterData?.member_count || 0;
        }
        
        // Get completed meetings count
        const { data: meetingsCount } = await supabase
          .rpc('get_completed_meetings_count', { professional_uuid: prof.id });

        const completedMeetings = meetingsCount || 0;

        // Determine appropriate reminder based on user context
        let reminder = '';
        let reminderTitle = '';

        if (chapterMemberCount < 25) {
          reminderTitle = '📢 Tu capítulo necesita crecer';
          reminder = `Tu capítulo tiene ${chapterMemberCount} miembros. ¡Invita a más profesionales para crear una red más fuerte! Cada nuevo miembro amplía las oportunidades para todos.`;
        } else if (completedMeetings < 3) {
          reminderTitle = '🤝 Tiempo de conectar';
          reminder = `Has completado ${completedMeetings} reuniones 1-a-1. ¡Agenda más encuentros con otros profesionales de tu capítulo para fortalecer tu red de contactos!`;
        } else {
          reminderTitle = '💰 Haz crecer tu red';
          reminder = `¿Conoces a otros profesionales que podrían beneficiarse de CONECTOR? Cada referido completado te da 100 puntos y una gratificación económica cuando cierren negocios.`;
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu inspiración diaria en CONECTOR</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🌟 Buenos días, ${prof.full_name}</h1>
            </td>
          </tr>
          
          <!-- Motivational Quote -->
          <tr>
            <td style="padding: 40px 30px; background-color: #f8f9fa;">
              <div style="background-color: #ffffff; border-left: 4px solid #667eea; padding: 20px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #2d3748; font-style: italic;">
                  "${motivationalQuote}"
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Reminder Section -->
          <tr>
            <td style="padding: 0 30px 40px 30px;">
              <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 8px; padding: 25px;">
                <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">
                  ${reminderTitle}
                </h2>
                <p style="color: #4a5568; margin: 0; font-size: 16px; line-height: 1.6;">
                  ${reminder}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <a href="https://tudominio.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Ir a CONECTOR
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px;">
                CONECTOR - Tu red profesional de confianza
              </p>
              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                Este correo se envía automáticamente cada día para inspirarte.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        await resend.emails.send({
          from: "CONECTOR <onboarding@resend.dev>",
          to: [prof.email],
          subject: `🌟 Tu inspiración diaria - ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          html: emailHtml,
        });

        console.log(`Email sent to ${prof.email}`);
        return { success: true, email: prof.email };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to send email to ${prof.email}:`, err);
        return { success: false, email: prof.email, error: errorMessage };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`Emails sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: "Daily motivation emails sent",
        total: professionals.length,
        successful,
        failed,
        quote: motivationalQuote,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error("Error in send-daily-motivation function:", err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
