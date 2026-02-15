import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const statusEmailSchema = z.object({
  professionalId: z.string().uuid(),
  status: z.enum(['approved', 'rejected'])
});

interface StatusEmailRequest {
  professionalId: string;
  status: "approved" | "rejected";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
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
    const validationResult = statusEmailSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input',
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { professionalId, status } = validationResult.data;

    console.log("Processing status email for professional:", professionalId, "Status:", status);

    // Create Supabase client with auth to verify user
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

    // Verify user owns this professional record or is admin
    const { data: targetProfessional } = await supabaseAdmin
      .from("professionals")
      .select("user_id, full_name, email, business_name")
      .eq("id", professionalId)
      .single();

    if (!targetProfessional) {
      return new Response(JSON.stringify({ error: 'Professional not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    // Verify ownership or admin status
    if (targetProfessional.user_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Cannot send status email for this professional' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const professional = targetProfessional;

    console.log("Sending email to:", professional.email);

    // Prepare email content based on status
    const isApproved = status === "approved";
    const subject = isApproved 
      ? "¡Tu perfil ha sido aprobado en CONECTOR!" 
      : "Actualización sobre tu solicitud en CONECTOR";

    const htmlContent = isApproved
      ? `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>¡Bienvenido a CONECTOR!</h1>
              </div>
              <div class="content">
                <h2>Hola ${professional.full_name},</h2>
                <p>¡Excelentes noticias! Tu perfil profesional ha sido aprobado.</p>
                <p>Ya formas parte de la red de profesionales de <strong>${professional.business_name}</strong> en CONECTOR.</p>
                <p>Ahora puedes:</p>
                <ul>
                  <li>Aparecer en el directorio de profesionales</li>
                  <li>Conectar con otros profesionales</li>
                  <li>Recibir y hacer referidos</li>
                  <li>Participar en reuniones de negocio</li>
                </ul>
                <div style="text-align: center;">
                  <a href="${supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}/dashboard" class="button">
                    Ir a mi Dashboard
                  </a>
                </div>
                <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                <p>¡Bienvenido a la comunidad!</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CONECTOR. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Actualización de tu Solicitud</h1>
              </div>
              <div class="content">
                <h2>Hola ${professional.full_name},</h2>
                <p>Gracias por tu interés en unirte a CONECTOR.</p>
                <p>Lamentablemente, después de revisar tu solicitud, no podemos aprobar tu perfil en este momento.</p>
                <p>Esto puede deberse a:</p>
                <ul>
                  <li>Información incompleta en el perfil</li>
                  <li>Requisitos específicos no cumplidos</li>
                  <li>Necesidad de documentación adicional</li>
                </ul>
                <p>Si crees que esto es un error o deseas obtener más información, por favor contáctanos.</p>
                <p>Apreciamos tu comprensión.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CONECTOR. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
        </html>
      `;

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "CONECTOR <onboarding@resend.dev>",
      to: [professional.email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado exitosamente"
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
    console.error("Error in send-professional-status-email function:", error);
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
