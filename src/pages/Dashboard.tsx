import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AIChat } from "@/components/AIChat";
import { AchievementModal } from "@/components/gamification/AchievementModal";
import { RankingCard } from "@/components/gamification/RankingCard";
import { useAchievements } from "@/hooks/useAchievements";

import { DynamicGreeting } from "@/components/dashboard/DynamicGreeting";
import { SmartSuggestions } from "@/components/dashboard/SmartSuggestions";
import { useWeeklyGoals } from "@/hooks/useWeeklyGoals";
import { AliciaWelcomeModal } from "@/components/AliciaWelcomeModal";

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

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [professional, setProfessional] = useState<any>(null);
  const { achievement, clearAchievement } = useAchievements();
  const chatRef = useRef<HTMLDivElement>(null);
  
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
      
      <AchievementModal 
        achievement={achievement}
        onClose={clearAchievement}
      />
      
      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !stats ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Completa tu perfil</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Para comenzar a usar CONECTOR, primero necesitas completar tu perfil profesional.
            </p>
            <Button onClick={() => navigate('/profile')}>
              Ir a Mi Marca
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Dynamic Greeting */}
          <DynamicGreeting 
            userName={professional?.full_name?.split(' ')[0] || 'Profesional'}
            consecutiveDays={0}
          />

          {/* Alic.ia Chat - MÁXIMA PROMINENCIA */}
          <div ref={chatRef} className="w-full">
            <AIChat />
          </div>
          
          {/* Smart Suggestions - 1 acción clave */}
          <SmartSuggestions goals={goals} />

          {/* 3 KPIs compactas */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <RankingCard 
              ranking={stats.ranking}
              totalPoints={stats.totalPoints}
              level={{
                name: stats.level.name,
                color: stats.level.color
              }}
            />
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/referrals')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Referencias</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.referralsSent}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.referralsCompleted} completadas
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/meetings')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cara a Cara</CardTitle>
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
