import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, Loader2 } from "lucide-react";
import { ProfileForm } from "@/components/ProfileForm";
import { useNavigate } from "react-router-dom";
import { AIChat } from "@/components/AIChat";
import { AchievementModal } from "@/components/gamification/AchievementModal";
import { RankingCard } from "@/components/gamification/RankingCard";
import { useAchievements } from "@/hooks/useAchievements";

import { DynamicGreeting } from "@/components/dashboard/DynamicGreeting";
import { SmartSuggestions } from "@/components/dashboard/SmartSuggestions";
import { useWeeklyGoals } from "@/hooks/useWeeklyGoals";
import { AliciaWelcomeModal } from "@/components/AliciaWelcomeModal";
import { DealLimitBanner } from "@/components/subscription/DealLimitBanner";
import { DealUpgradePrompt } from "@/components/subscription/DealUpgradePrompt";

interface DashboardStats {
  referralsSent: number;
  referralsCompleted: number;
  totalPoints: number;
  ranking: number;
  level: {
    name: string;
    color: string;
    minPoints: number;
    maxPoints: number | null;
  };
}

interface UpcomingMeeting {
  id: string;
  meeting_date: string;
  meeting_type: string;
  recipient: { full_name: string };
}

const MAX_FREE_DEALS = 2;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [professional, setProfessional] = useState<any>(null);
  const { achievement, clearAchievement } = useAchievements();
  const chatRef = useRef<HTMLDivElement>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  const { goals } = useWeeklyGoals(professional?.id || null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        const { data: professionalData } = await supabase
          .from("professionals")
          .select(`
            id, 
            total_points, 
            full_name, 
            status,
            chapter_id,
            business_sphere_id,
            deals_completed,
            total_deal_value,
            subscription_plan_id,
            subscription_plans (slug),
            business_spheres (
              name,
              icon,
              color
            )
          `)
          .eq("user_id", user.id)
          .single();

        if (!professionalData) {
          setLoading(false);
          return;
        }

        setProfessional(professionalData);

        // Check if user just hit 2 deals and should see upgrade prompt
        const isPremium = (professionalData as any).subscription_plans?.slug === 'premium';
        if (professionalData.deals_completed >= MAX_FREE_DEALS && !isPremium) {
          const dismissed = sessionStorage.getItem('upgrade-prompt-dismissed');
          if (!dismissed) {
            setShowUpgradePrompt(true);
          }
        }

        const { data: referrals } = await supabase
          .from("referrals")
          .select("status, created_at")
          .eq("referrer_id", professionalData.id);

        const referralsSent = referrals?.length || 0;
        const referralsCompleted = referrals?.filter(r => r.status === "completed").length || 0;

        const { data: level } = await supabase
          .from("point_levels")
          .select("name, badge_color, min_points, max_points")
          .lte("min_points", professionalData.total_points)
          .order("min_points", { ascending: false })
          .limit(1)
          .single();

        const { count } = await supabase
          .from("professionals")
          .select("*", { count: "exact", head: true })
          .gt("total_points", professionalData.total_points);

        const ranking = (count || 0) + 1;

        const { data: meetings } = await supabase
          .from("meetings")
          .select(`
            id,
            meeting_date,
            meeting_type,
            professionals!meetings_recipient_id_fkey (full_name)
          `)
          .eq("requester_id", professionalData.id)
          .eq("status", "confirmed")
          .gte("meeting_date", new Date().toISOString())
          .order("meeting_date", { ascending: true })
          .limit(3);

        setUpcomingMeetings((meetings || []).map(m => ({
          ...m,
          recipient: m.professionals
        })) as any);

        setStats({
          referralsSent,
          referralsCompleted,
          totalPoints: professionalData.total_points,
          ranking,
          level: {
            name: level?.name || "Bronce",
            color: level?.badge_color || "#CD7F32",
            minPoints: level?.min_points || 0,
            maxPoints: level?.max_points
          }
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const handleUpgradeDismiss = () => {
    sessionStorage.setItem('upgrade-prompt-dismissed', 'true');
    setShowUpgradePrompt(false);
  };

  return (
    <div className="space-y-6">
      {professional?.id && (
        <AliciaWelcomeModal 
          professionalId={professional.id}
          userName={professional.full_name.split(' ')[0]}
          onOpenFullChat={() => {
            chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}

      {/* Upgrade prompt - only shows when 2+ deals completed */}
      <DealUpgradePrompt
        totalEarnings={professional?.total_deal_value || 0}
        dealsCompleted={professional?.deals_completed || 0}
        open={showUpgradePrompt}
        onClose={handleUpgradeDismiss}
      />
      
      <AchievementModal 
        achievement={achievement}
        onClose={clearAchievement}
      />
      
      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !professional ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <ProfileForm />
        </div>
      ) : (
        <>
          {/* Dynamic Greeting */}
          <DynamicGreeting 
            userName={professional?.full_name?.split(' ')[0] || 'Profesional'}
            consecutiveDays={0}
            chapterSize={stats?.level ? upcomingMeetings.length : 0}
            referralsSent={stats?.referralsSent || 0}
            meetingsCompleted={upcomingMeetings.length}
          />

          {/* Subtle deal limit banner */}
          <DealLimitBanner
            dealsCompleted={professional?.deals_completed || 0}
            maxFreeDeals={MAX_FREE_DEALS}
            totalEarnings={professional?.total_deal_value || 0}
            onUpgrade={() => setShowUpgradePrompt(true)}
          />

          {/* Alic.ia Chat */}
          <div ref={chatRef} className="w-full">
            <AIChat />
          </div>
          
          {/* Smart Suggestions */}
          <SmartSuggestions goals={goals} />

          {/* 3 KPIs */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <RankingCard 
              ranking={stats?.ranking || 0}
              totalPoints={stats?.totalPoints || 0}
              level={{
                name: stats?.level.name || "Bronce",
                color: stats?.level.color || "#CD7F32"
              }}
            />
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/referrals')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Referencias</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.referralsSent || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.referralsCompleted || 0} completadas
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/meetings')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">El Ritual</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
                <p className="text-xs text-muted-foreground">
                  Reuniones confirmadas
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
