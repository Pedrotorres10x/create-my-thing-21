import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WeeklyGoals {
  referrals_this_week: number;
  meetings_this_month: number;
  chapter_member_count: number;
  days_until_week_end: number;
  days_until_month_end: number;
  posts_this_week: number;
  comments_this_week: number;
}

export const useWeeklyGoals = (professionalId: string | null) => {
  const [goals, setGoals] = useState<WeeklyGoals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!professionalId) {
      setLoading(false);
      return;
    }

    const fetchGoals = async () => {
      try {
        // First upsert to ensure record exists
        await supabase.rpc('upsert_user_weekly_goals', {
          p_professional_id: professionalId
        });

        // Then fetch the calculated goals
        const { data, error } = await supabase.rpc('calculate_user_weekly_goals', {
          p_professional_id: professionalId
        });

        if (error) throw error;

        if (data && data.length > 0) {
          setGoals(data[0]);
        }
      } catch (error) {
        console.error('Error fetching weekly goals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [professionalId]);

  return { goals, loading };
};
