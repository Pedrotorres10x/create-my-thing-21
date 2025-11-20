import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plantillas de email por stage
const getEmailTemplate = (stage: string, userName: string, inactivityDays: number) => {
  const templates = {
    at_risk: {
      subject: `🤝 ${userName}, tu red te está esperando`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
              .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .bonus { background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>¡Te echamos de menos! 🤝</h1>
              </div>
              <div class="content">
                <p>Hola ${userName},</p>
                <p>Han pasado <strong>${inactivityDays} días</strong> desde tu última visita y tu red profesional te está esperando.</p>
                <p>Mientras no estabas, han pasado cosas interesantes:</p>
                <ul>
                  <li>✨ Nuevas oportunidades de negocio en tu sector</li>
                  <li>🎯 Profesionales buscando colaboraciones como la tuya</li>
                  <li>💼 Reuniones que podrían interesarte</li>
                </ul>
                <div class="bonus">
                  <strong>🎁 Regalo de bienvenida:</strong> Vuelve hoy y gana <strong>50 puntos bonus</strong> solo por reconectar.
                </div>
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.lovable.app'}" class="cta-button">
                  Ver qué me he perdido
                </a>
                <p>Tu red te necesita activo. ¡Vuelve y sigue creciendo!</p>
              </div>
              <div class="footer">
                <p>Recibiste este email porque llevas tiempo sin visitar tu cuenta.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    inactive: {
      subject: `⚡ ${userName}, oferta exclusiva solo para ti - 30% descuento`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
              .cta-button { display: inline-block; background: #f5576c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
              .discount { background: #fff3cd; border: 2px dashed #f5576c; padding: 20px; margin: 20px 0; text-align: center; }
              .urgency { background: #fee; border-left: 4px solid #f5576c; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>¡Oferta Exclusiva Para Ti! ⚡</h1>
              </div>
              <div class="content">
                <p>Hola ${userName},</p>
                <p>Llevas <strong>${inactivityDays} días</strong> sin conectar y sabemos que tu negocio merece más.</p>
                <p><strong>Hemos preparado algo especial para ti:</strong></p>
                <div class="discount">
                  <h2 style="margin: 0; color: #f5576c;">30% DE DESCUENTO</h2>
                  <p style="font-size: 18px; margin: 10px 0;">En tu upgrade a Plan Provincial</p>
                  <p style="font-size: 14px; color: #666;">Accede a toda tu provincia + beneficios premium</p>
                </div>
                <p><strong>Con el Plan Provincial obtienes:</strong></p>
                <ul>
                  <li>🌟 Acceso a toda tu provincia</li>
                  <li>💬 Mensajes IA ilimitados</li>
                  <li>📊 Dashboard de análisis avanzado</li>
                  <li>🎯 Prioridad en búsquedas</li>
                </ul>
                <div class="urgency">
                  ⏰ <strong>Atención:</strong> Esta oferta es válida solo por <strong>7 días</strong>
                </div>
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.lovable.app'}/subscriptions" class="cta-button">
                  Aprovechar mi descuento
                </a>
              </div>
              <div class="footer">
                <p>Oferta exclusiva por tiempo limitado.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    dormant: {
      subject: `🚨 ${userName}, última oportunidad - 50% descuento`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
              .cta-button { display: inline-block; background: #ff6b6b; color: white; padding: 20px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 18px; }
              .mega-discount { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 30px; margin: 20px 0; text-align: center; border-radius: 10px; }
              .warning { background: #fee; border: 3px solid #ff6b6b; padding: 20px; margin: 20px 0; text-align: center; }
              .stats { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚨 ÚLTIMA OPORTUNIDAD</h1>
              </div>
              <div class="content">
                <p>Hola ${userName},</p>
                <div class="warning">
                  <h3 style="margin: 0; color: #ff6b6b;">⚠️ Tu cuenta será desactivada en 9 días</h3>
                  <p style="margin: 10px 0 0 0;">Llevas <strong>${inactivityDays} días</strong> sin actividad</p>
                </div>
                <div class="stats">
                  <p><strong>Mientras no estabas:</strong></p>
                  <ul style="margin: 10px 0;">
                    <li>📉 Perdiste oportunidades de contactos valiosos</li>
                    <li>💼 Se realizaron reuniones en tu sector sin ti</li>
                    <li>🎯 Tu red creció y tú no estuviste ahí</li>
                  </ul>
                </div>
                <p><strong>No queremos que te vayas. Por eso te ofrecemos:</strong></p>
                <div class="mega-discount">
                  <h2 style="margin: 0;">50% DE DESCUENTO</h2>
                  <p style="font-size: 20px; margin: 10px 0;">Primer mes Plan Provincial</p>
                  <p style="margin: 10px 0;">+ <strong>150 puntos bonus</strong> al reactivar</p>
                </div>
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.lovable.app'}" class="cta-button">
                  🔥 Reactivar mi cuenta AHORA
                </a>
                <p style="text-align: center; color: #666; font-size: 14px;">Esta es tu última oportunidad de aprovechar esta oferta</p>
              </div>
              <div class="footer">
                <p>Si no reactivás tu cuenta en 9 días, será suspendida automáticamente.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
  };

  return templates[stage as keyof typeof templates] || templates.at_risk;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret for scheduled jobs
    const cronSecret = req.headers.get('X-Cron-Secret');
    if (cronSecret !== Deno.env.get('CRON_SECRET')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting reengagement notification campaign...');

    // Obtener usuarios que necesitan notificación
    const { data: usersToNotify, error: usersError } = await supabase
      .from('user_activity_tracking')
      .select(`
        professional_id,
        reengagement_stage,
        inactivity_days,
        last_notification_sent,
        professionals (
          full_name,
          email,
          status,
          moderation_blocked
        )
      `)
      .in('reengagement_stage', ['at_risk', 'inactive', 'dormant'])
      .eq('professionals.status', 'approved')
      .eq('professionals.moderation_blocked', false);

    if (usersError) throw usersError;

    console.log(`Found ${usersToNotify?.length || 0} users to notify`);

    const results = {
      sent: 0,
      skipped: 0,
      failed: 0,
      byStage: {
        at_risk: 0,
        inactive: 0,
        dormant: 0,
      },
    };

    for (const user of usersToNotify || []) {
      try {
        const professional = Array.isArray(user.professionals) 
          ? user.professionals[0] 
          : user.professionals;

        if (!professional?.email || !professional?.full_name) {
          console.log(`Skipping user ${user.professional_id}: missing data`);
          results.skipped++;
          continue;
        }

        // Verificar si ya enviamos notificación recientemente (últimas 24 horas)
        const lastSent = user.last_notification_sent 
          ? new Date(user.last_notification_sent).getTime()
          : 0;
        const now = Date.now();
        const hoursSinceLastNotification = (now - lastSent) / (1000 * 60 * 60);

        if (hoursSinceLastNotification < 24) {
          console.log(`Skipping ${professional.email}: notified ${hoursSinceLastNotification.toFixed(1)}h ago`);
          results.skipped++;
          continue;
        }

        // Obtener plantilla de email según stage
        const template = getEmailTemplate(
          user.reengagement_stage,
          professional.full_name,
          user.inactivity_days || 0
        );

        // Enviar email con Resend
        const emailResponse = await resend.emails.send({
          from: 'Red Profesional <onboarding@resend.dev>',
          to: [professional.email],
          subject: template.subject,
          html: template.html,
        });

        console.log(`Email sent to ${professional.email}:`, emailResponse);

        // Actualizar última notificación
        await supabase
          .from('user_activity_tracking')
          .update({
            last_notification_sent: new Date().toISOString(),
          })
          .eq('professional_id', user.professional_id);

        results.sent++;
        results.byStage[user.reengagement_stage as keyof typeof results.byStage]++;

      } catch (emailError) {
        console.error(`Error sending email to user ${user.professional_id}:`, emailError);
        results.failed++;
      }
    }

    console.log('Notification campaign complete:', results);

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
    console.error('Error in send-reengagement-notifications:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
