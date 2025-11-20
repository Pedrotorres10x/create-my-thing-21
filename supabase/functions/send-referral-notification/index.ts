import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const referralNotificationSchema = z.object({
  referrerId: z.string().uuid(),
  referredEmail: z.string().email().max(255),
  pointsEarned: z.number().int().min(0).max(1000)
});

interface NotificationRequest {
  referrerId: string;
  referredEmail: string;
  pointsEarned: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
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
    const validationResult = referralNotificationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input',
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { referrerId, referredEmail, pointsEarned } = validationResult.data;

    console.log("Processing referral notification:", { referrerId, referredEmail, pointsEarned });

    // Create Supabase client with auth
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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

    // Use service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get referrer information and verify ownership
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from("professionals")
      .select("email, full_name, total_points")
      .eq("id", referrerId)
      .single();

    if (referrerError || !referrer) {
      console.error("Error fetching referrer:", referrerError);
      throw new Error("No se pudo encontrar la información del referente");
    }

    // Verify user owns this referrer record
    const { data: referrerProfile } = await supabaseAdmin
      .from("professionals")
      .select("user_id")
      .eq("id", referrerId)
      .single();

    if (!referrerProfile || referrerProfile.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Cannot send notification for this referrer' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get level information
    const { data: level, error: levelError } = await supabaseAdmin
      .from("point_levels")
      .select("name, badge_color")
      .lte("min_points", referrer.total_points)
      .order("min_points", { ascending: false })
      .limit(1)
      .single();

    if (levelError) {
      console.error("Error fetching level:", levelError);
    }

    const levelName = level?.name || "Bronce";

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "CONECTOR <onboarding@resend.dev>",
      to: [referrer.email],
      subject: "🎉 ¡Tu referido ha sido aprobado!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .badge {
                display: inline-block;
                padding: 8px 16px;
                background: ${level?.badge_color || "#CD7F32"}20;
                border: 2px solid ${level?.badge_color || "#CD7F32"};
                color: ${level?.badge_color || "#CD7F32"};
                border-radius: 20px;
                font-weight: bold;
                margin: 10px 0;
              }
              .points-box {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
              }
              .points-number {
                font-size: 36px;
                font-weight: bold;
                color: #667eea;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎉 ¡Felicitaciones ${referrer.full_name}!</h1>
            </div>
            <div class="content">
              <p>Tu referido <strong>${referredEmail}</strong> ha sido aprobado y ahora es parte de CONECTOR.</p>
              
              <div class="points-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Has ganado</p>
                <div class="points-number">+${pointsEarned}</div>
                <p style="margin: 0; font-size: 14px; color: #666;">puntos</p>
              </div>

              <p><strong>Tu progreso actual:</strong></p>
              <ul style="list-style: none; padding: 0;">
                <li>💎 Puntos totales: <strong>${referrer.total_points}</strong></li>
                <li>🏆 Nivel actual: <span class="badge">${levelName}</span></li>
              </ul>

              <p style="margin-top: 30px;">
                ¡Sigue compartiendo CONECTOR con otros profesionales para ganar más puntos y alcanzar niveles superiores!
              </p>

              <p style="margin-top: 20px;">
                <a href="${supabaseUrl}/dashboard" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Ver mi Dashboard
                </a>
              </p>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático de CONECTOR. Por favor no respondas a este correo.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notificación enviada exitosamente",
        emailResponse 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-referral-notification:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred processing your request'
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
