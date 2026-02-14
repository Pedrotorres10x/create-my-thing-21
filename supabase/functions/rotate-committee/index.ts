import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find chapters that need rotation (next_rotation_at has passed)
    const { data: dueRotations } = await supabase
      .from('committee_rotations')
      .select('chapter_id')
      .lte('next_rotation_at', new Date().toISOString())
      .order('next_rotation_at', { ascending: true });

    // Also find chapters that have never had a rotation
    const { data: allChapters } = await supabase
      .from('chapters')
      .select('id')
      .gte('member_count', 3);

    const chapterIdsToRotate = new Set<string>();

    // Add chapters with due rotations
    dueRotations?.forEach(r => chapterIdsToRotate.add(r.chapter_id));

    // Add chapters that have 3+ members but no rotation yet
    if (allChapters) {
      for (const ch of allChapters) {
        const { count } = await supabase
          .from('committee_rotations')
          .select('id', { count: 'exact', head: true })
          .eq('chapter_id', ch.id);
        if ((count || 0) === 0) chapterIdsToRotate.add(ch.id);
      }
    }

    const results = [];

    for (const chapterId of chapterIdsToRotate) {
      // Get top 3 by points in this chapter
      const { data: top3 } = await supabase
        .from('professionals')
        .select('id, full_name, total_points')
        .eq('chapter_id', chapterId)
        .eq('status', 'approved')
        .eq('moderation_blocked', false)
        .order('total_points', { ascending: false })
        .limit(3);

      if (!top3 || top3.length < 3) {
        results.push({ chapterId, status: 'skipped', reason: 'less than 3 eligible members' });
        continue;
      }

      // Insert new rotation
      const { error } = await supabase
        .from('committee_rotations')
        .insert({
          chapter_id: chapterId,
          member_1_id: top3[0].id,
          member_2_id: top3[1].id,
          member_3_id: top3[2].id,
          is_founding: false,
          next_rotation_at: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (error) {
        results.push({ chapterId, status: 'error', error: error.message });
      } else {
        results.push({
          chapterId,
          status: 'rotated',
          committee: top3.map(m => ({ id: m.id, name: m.full_name, points: m.total_points }))
        });
      }
    }

    return new Response(JSON.stringify({ success: true, rotations: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error rotating committees:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
