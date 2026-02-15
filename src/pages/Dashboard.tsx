import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, Loader2, ArrowRight, Handshake, TrendingUp, Target } from "lucide-react";
import { ProfileForm } from "@/components/ProfileForm";
import { useNavigate } from "react-router-dom";
import { AIChat } from "@/components/AIChat";
import { AchievementModal } from "@/components/gamification/AchievementModal";
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
            photo_url,
            profession_specialization_id,
            professional_type,
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
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full gradient-primary animate-pulse opacity-30" />
              <Loader2 className="w-8 h-8 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">Cargando tu tablero...</p>
          </div>
        </div>
      ) : !professional ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <ProfileForm />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hero Greeting with ranking embedded */}
          <DynamicGreeting 
            userName={professional?.full_name?.split(' ')[0] || 'Profesional'}
            consecutiveDays={0}
            chapterSize={stats?.level ? upcomingMeetings.length : 0}
            referralsSent={stats?.referralsSent || 0}
            meetingsCompleted={upcomingMeetings.length}
            ranking={stats?.ranking}
            totalPoints={stats?.totalPoints}
            levelName={stats?.level.name}
            levelColor={stats?.level.color}
            isProfileIncomplete={!professional?.photo_url || !professional?.profession_specialization_id || !professional?.professional_type}
          />

          {/* Deal limit banner */}
          <DealLimitBanner
            dealsCompleted={professional?.deals_completed || 0}
            maxFreeDeals={MAX_FREE_DEALS}
            totalEarnings={professional?.total_deal_value || 0}
            onUpgrade={() => setShowUpgradePrompt(true)}
          />

          {/* Alic.ia Chat — protagonista */}
          <div ref={chatRef} className="w-full">
            <AIChat />
          </div>

          {/* Smart Suggestions (invitar, etc.) */}
          <SmartSuggestions goals={goals} />

          {/* KPI Grid — secondary, al fondo */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <KPICard
              title="Referencias"
              value={stats?.referralsSent || 0}
              subtitle={`${stats?.referralsCompleted || 0} completadas`}
              icon={<Handshake className="h-5 w-5" />}
              gradient="from-primary/10 to-secondary/5"
              accentColor="text-primary"
              onClick={() => navigate('/referrals')}
            />
            <KPICard
              title="El Cafelito"
              value={upcomingMeetings.length}
              subtitle="Reuniones confirmadas"
              icon={<Calendar className="h-5 w-5" />}
              gradient="from-secondary/10 to-primary/5"
              accentColor="text-secondary"
              onClick={() => navigate('/meetings')}
            />
            <KPICard
              title="Crecimiento"
              value={`${stats?.totalPoints || 0}`}
              subtitle="Puntos totales"
              icon={<TrendingUp className="h-5 w-5" />}
              gradient="from-accent/10 to-primary/5"
              accentColor="text-accent"
              onClick={() => navigate('/somos-unicos')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// KPI Card component
interface KPICardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  accentColor: string;
  onClick: () => void;
}

function KPICard({ title, value, subtitle, icon, gradient, accentColor, onClick }: KPICardProps) {
  return (
    <Card 
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-border/50"
      onClick={onClick}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50 group-hover:opacity-80 transition-opacity`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl bg-background/80 shadow-sm ${accentColor}`}>
            {icon}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1">{title}</p>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
