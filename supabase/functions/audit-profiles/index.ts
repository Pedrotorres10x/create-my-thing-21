import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get profiles that were updated since last audit OR never audited
    // First get all approved profiles, then filter in code
    const { data: profiles, error: fetchError } = await supabase
      .from('professionals')
      .select('id, full_name, company_name, position, bio, business_description, profile_updated_at, last_profile_audited_at, status')
      .eq('status', 'approved')
      .is('last_profile_audited_at', null)
      .limit(50);

    // Also get profiles updated after last audit
    const { data: updatedProfiles, error: fetchError2 } = await supabase
      .from('professionals')
      .select('id, full_name, company_name, position, bio, business_description, profile_updated_at, last_profile_audited_at, status')
      .eq('status', 'approved')
      .not('last_profile_audited_at', 'is', null)
      .not('profile_updated_at', 'is', null)
      .limit(50);

    if (fetchError || fetchError2) {
      throw new Error(`Error fetching profiles: ${fetchError?.message || fetchError2?.message}`);
    }

    // Filter updated profiles where profile_updated_at > last_profile_audited_at
    const changedProfiles = (updatedProfiles || []).filter(p => 
      p.profile_updated_at && p.last_profile_audited_at && 
      new Date(p.profile_updated_at) > new Date(p.last_profile_audited_at)
    );

    const allProfiles = [...(profiles || []), ...changedProfiles].slice(0, 50);

    if (fetchError) {
      throw new Error(`Error fetching profiles: ${fetchError.message}`);
    }

    if (!allProfiles || allProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles to audit", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Auditing ${allProfiles.length} profiles...`);

    let flaggedCount = 0;
    const auditLogs: any[] = [];

    for (const profile of allProfiles) {
      // Build text fields to check
      const fieldsToCheck: Record<string, string> = {};
      if (profile.full_name) fieldsToCheck['Nombre'] = profile.full_name;
      if (profile.company_name) fieldsToCheck['Empresa'] = profile.company_name;
      if (profile.position) fieldsToCheck['Cargo'] = profile.position;
      if (profile.bio) fieldsToCheck['Biografía'] = profile.bio;
      if (profile.business_description) fieldsToCheck['Descripción'] = profile.business_description;

      if (Object.keys(fieldsToCheck).length === 0) {
        // Mark as audited even if no fields
        await supabase
          .from('professionals')
          .update({ last_profile_audited_at: new Date().toISOString() })
          .eq('id', profile.id);
        continue;
      }

      // Send all fields to AI for batch analysis
      const fieldsSummary = Object.entries(fieldsToCheck)
        .map(([field, value]) => `${field}: "${value}"`)
        .join('\n');

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Eres un auditor de perfiles para CONECTOR, una plataforma profesional seria.

ANALIZA estos campos de perfil y detecta:
1. Nombres falsos, de broma o inapropiados (ej: "Pepito Grillo", "Batman")
2. Nombres de empresa inventados o groseros
3. Cargos absurdos o humorísticos (ej: "Rey del universo")
4. Biografías con spam, enlaces sospechosos o contenido inapropiado
5. Descripciones con lenguaje vulgar, sexual o discriminatorio
6. Cualquier contenido que no sea profesional

Responde SOLO con JSON:
{
  "issues": [
    {
      "field": "nombre del campo",
      "content": "contenido problemático",
      "severity": "low|medium|high",
      "reason": "explicación breve"
    }
  ]
}

Si todo está correcto, devuelve: {"issues": []}`
              },
              {
                role: "user",
                content: `Audita este perfil profesional:\n\n${fieldsSummary}`
              }
            ],
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          console.error(`AI audit failed for ${profile.id}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const resultText = data.choices?.[0]?.message?.content;

        if (!resultText) continue;

        const result = JSON.parse(resultText);

        if (result.issues && result.issues.length > 0) {
          flaggedCount++;
          for (const issue of result.issues) {
            auditLogs.push({
              professional_id: profile.id,
              audit_type: 'daily_scan',
              field_name: issue.field,
              flagged_content: issue.content,
              severity: issue.severity || 'medium',
              reason: issue.reason,
            });
          }
        }
      } catch (aiError) {
        console.error(`AI error for profile ${profile.id}:`, aiError);
      }

      // Mark profile as audited
      await supabase
        .from('professionals')
        .update({ last_profile_audited_at: new Date().toISOString() })
        .eq('id', profile.id);
    }

    // Insert all audit logs and create admin notifications
    if (auditLogs.length > 0) {
      const { data: insertedLogs, error: insertError } = await supabase
        .from('profile_audit_logs')
        .insert(auditLogs)
        .select('id, professional_id, field_name, flagged_content, severity, reason');

      if (insertError) {
        console.error('Error inserting audit logs:', insertError);
      }

      // Create admin notifications for each flagged profile (grouped)
      const flaggedByProfessional = new Map<string, typeof auditLogs>();
      for (const log of auditLogs) {
        const existing = flaggedByProfessional.get(log.professional_id) || [];
        existing.push(log);
        flaggedByProfessional.set(log.professional_id, existing);
      }

      const notifications: any[] = [];
      for (const [profId, issues] of flaggedByProfessional) {
        const profile = allProfiles.find(p => p.id === profId);
        const issuesSummary = issues.map(i => `• ${i.field_name}: ${i.reason}`).join('\n');
        const maxSeverity = issues.some(i => i.severity === 'high') ? 'high' 
          : issues.some(i => i.severity === 'medium') ? 'medium' : 'low';

        notifications.push({
          notification_type: 'profile_audit',
          title: `⚠️ Perfil sospechoso: ${profile?.full_name || 'Desconocido'}`,
          description: `Se detectaron ${issues.length} problema(s) en el perfil:\n${issuesSummary}`,
          related_professional_id: profId,
          severity: maxSeverity,
          metadata: { issues_count: issues.length, fields: issues.map(i => i.field_name) },
        });
      }

      if (notifications.length > 0) {
        const { error: notifError } = await supabase
          .from('admin_notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Error creating admin notifications:', notifError);
        }
      }
    }

    console.log(`Audit complete: ${allProfiles.length} scanned, ${flaggedCount} flagged, ${auditLogs.length} issues found`);

    return new Response(JSON.stringify({
      message: "Daily profile audit completed",
      profiles_scanned: allProfiles.length,
      profiles_flagged: flaggedCount,
      issues_found: auditLogs.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Profile audit error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
