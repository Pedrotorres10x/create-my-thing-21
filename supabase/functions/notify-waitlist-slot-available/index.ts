import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WaitlistEntry {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  position_in_queue: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for available premium slots...');

    // Get available slots count
    const { data: availableCount } = await supabase.rpc('get_available_slots_count');

    if (availableCount === null || availableCount <= 0) {
      console.log('No available slots');
      return new Response(
        JSON.stringify({ message: 'No available slots' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${availableCount} slots available, notifying waitlist...`);

    // Get top 5 in waitlist
    const { data: waitlist, error: waitlistError } = await supabase
      .from('marketplace_waitlist')
      .select('*')
      .eq('status', 'waiting')
      .order('position_in_queue')
      .limit(5);

    if (waitlistError) throw waitlistError;
    if (!waitlist || waitlist.length === 0) {
      console.log('Waitlist is empty');
      return new Response(
        JSON.stringify({ message: 'Waitlist is empty' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Notifying ${waitlist.length} companies from waitlist`);

    // Get RESEND_API_KEY
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not found');
    }

    // Send emails to each company on waitlist
    const notifications = await Promise.all(
      waitlist.map(async (entry: WaitlistEntry) => {
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: 'CONECTOR <noreply@conector.es>',
              to: [entry.contact_email],
              subject: '¡Espacio Premium Disponible en CONECTOR!',
              html: `
                <h1>¡Buenas noticias!</h1>
                <p>Hola ${entry.contact_name},</p>
                <p>Te informamos que hay espacios disponibles en el <strong>Marketplace Premium de CONECTOR</strong>.</p>
                <p>Tu empresa <strong>${entry.company_name}</strong> está en la posición #${entry.position_in_queue} de la lista de espera.</p>
                <p>Para reservar tu espacio publicitario premium, por favor contacta con nuestra agencia de publicidad lo antes posible.</p>
                <p>¡No pierdas esta oportunidad!</p>
                <hr />
                <p style="color: #666; font-size: 12px;">
                  Este es un correo automático del sistema CONECTOR. Por favor no respondas a este mensaje.
                </p>
              `,
            }),
          });

          if (!emailRes.ok) {
            const errorText = await emailRes.text();
            console.error(`Failed to send email to ${entry.contact_email}:`, errorText);
            return { success: false, email: entry.contact_email, error: errorText };
          }

          console.log(`Email sent successfully to ${entry.contact_email}`);
          return { success: true, email: entry.contact_email };
        } catch (error: any) {
          console.error(`Error sending email to ${entry.contact_email}:`, error);
          return { success: false, email: entry.contact_email, error: error.message };
        }
      })
    );

    return new Response(
      JSON.stringify({
        message: `Notified ${notifications.filter(n => n.success).length} companies`,
        notifications,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in notify-waitlist-slot-available:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
