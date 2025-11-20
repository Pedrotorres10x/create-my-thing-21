import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for expired premium slots...');

    // Get expired slots
    const { data: expiredSlots, error: expiredError } = await supabase
      .from('premium_marketplace_slots')
      .select('id, company_name, slot_number, contract_end_date')
      .eq('status', 'active')
      .lt('contract_end_date', new Date().toISOString());

    if (expiredError) throw expiredError;

    if (!expiredSlots || expiredSlots.length === 0) {
      console.log('No expired slots found');
    } else {
      console.log(`Found ${expiredSlots.length} expired slots, marking as expired...`);

      // Mark slots as expired
      const { error: updateError } = await supabase
        .from('premium_marketplace_slots')
        .update({ status: 'expired' })
        .in('id', expiredSlots.map(s => s.id));

      if (updateError) throw updateError;

      console.log('Slots marked as expired successfully');
    }

    // Check for slots expiring soon (30, 15, 7 days)
    const today = new Date();
    const warnings = [30, 15, 7];
    const expiringSlots = [];

    for (const days of warnings) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      
      const { data: slotsExpiringSoon, error } = await supabase
        .from('premium_marketplace_slots')
        .select('id, company_name, slot_number, contract_end_date, contact_email')
        .eq('status', 'active')
        .gte('contract_end_date', today.toISOString())
        .lte('contract_end_date', futureDate.toISOString());

      if (!error && slotsExpiringSoon && slotsExpiringSoon.length > 0) {
        expiringSlots.push(...slotsExpiringSoon.map(s => ({ ...s, daysUntilExpiry: days })));
      }
    }

    console.log(`Found ${expiringSlots.length} slots expiring soon`);

    // Notify about expiring slots (you could extend this to send emails)
    if (expiringSlots.length > 0) {
      console.log('Slots expiring soon:', expiringSlots);
      
      // Optional: Send notification emails to admins or companies
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        // Group by days until expiry for cleaner notifications
        const grouped: Record<number, any[]> = expiringSlots.reduce((acc: Record<number, any[]>, slot) => {
          const key = slot.daysUntilExpiry;
          if (!acc[key]) acc[key] = [];
          acc[key].push(slot);
          return acc;
        }, {});

        console.log('Sending expiration warning emails...');
        
        for (const [days, slots] of Object.entries(grouped)) {
          const slotList = (slots as any[]).map(s => 
            `- Slot #${s.slot_number}: ${s.company_name} (expira: ${new Date(s.contract_end_date).toLocaleDateString('es-ES')})`
          ).join('\n');

          // Send to admin (you can customize the recipient)
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: 'CONECTOR <noreply@conector.es>',
              to: ['admin@conector.es'], // Change to actual admin email
              subject: `⚠️ Contratos expirando en ${days} días`,
              html: `
                <h2>Contratos de Marketplace Premium expirando pronto</h2>
                <p>Los siguientes contratos expiran en <strong>${days} días</strong>:</p>
                <pre>${slotList}</pre>
                <p>Por favor, contacta con estas empresas para renovar sus contratos.</p>
              `,
            }),
          });
        }
      }
    }

    // Trigger waitlist notification if slots became available
    if (expiredSlots && expiredSlots.length > 0) {
      console.log('Triggering waitlist notification...');
      await supabase.functions.invoke('notify-waitlist-slot-available');
    }

    return new Response(
      JSON.stringify({
        message: 'Slot expiration check completed',
        expiredCount: expiredSlots?.length || 0,
        expiringCount: expiringSlots.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in track-slot-expiration:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
