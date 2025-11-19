import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Trophy, Calendar, Zap, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AIChat } from "@/components/AIChat";
import { PointsLevelBadge } from "@/components/PointsLevelBadge";
import { DailyMotivationModal } from "@/components/DailyMotivationModal";
import { AchievementModal } from "@/components/gamification/AchievementModal";
import { RankingCard } from "@/components/gamification/RankingCard";
import { useAchievements } from "@/hooks/useAchievements";
import { ReengagementWelcomeBack } from "@/components/reengagement/ReengagementWelcomeBack";
import { PremiumBanner } from "@/components/advertising/PremiumBanner";
import { DynamicGreeting } from "@/components/dashboard/DynamicGreeting";
import { SmartSuggestions } from "@/components/dashboard/SmartSuggestions";
import { ProgressTracker } from "@/components/dashboard/ProgressTracker";
import { useWeeklyGoals } from "@/hooks/useWeeklyGoals";
import { SphereStatsCard } from "@/components/SphereStatsCard";
import { SphereStatsEnhanced } from "@/components/sphere/SphereStatsEnhanced";
import { SphereSynergyCard } from "@/components/sphere/SphereSynergyCard";
import { SphereActivityFeed } from "@/components/sphere/SphereActivityFeed";
import { SphereReferenceDialog } from "@/components/sphere/SphereReferenceDialog";

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
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  const { achievement, clearAchievement } = useAchievements();
  
  // Weekly goals for dynamic suggestions
  const { goals } = useWeeklyGoals(professional?.id || null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Get professional data
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

        // Get referrals statistics
        const { data: referrals } = await supabase
          .from("referrals")
          .select("status, created_at")
          .eq("referrer_id", professionalData.id);

        const referralsSent = referrals?.length || 0;
        const referralsCompleted = referrals?.filter(r => r.status === "completed").length || 0;

        // Get level information
        const { data: level } = await supabase
          .from("point_levels")
          .select("name, badge_color, min_points, max_points")
          .lte("min_points", professionalData.total_points)
          .order("min_points", { ascending: false })
          .limit(1)
          .single();

        // Get ranking
        const { count } = await supabase
          .from("professionals")
          .select("*", { count: "exact", head: true })
          .gt("total_points", professionalData.total_points);

        const ranking = (count || 0) + 1;

        // Get upcoming meetings
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
      <DailyMotivationModal />
      <ReengagementWelcomeBack />
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
              Ir a Mi Perfil
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

          {/* Alic.ia Chat - MÁXIMA PROMINENCIA - FULL WIDTH */}
          <div className="w-full">
            <AIChat />
          </div>
          
          {/* Smart Suggestions */}
          <SmartSuggestions goals={goals} />

          {/* Sphere Stats */}
          {professional?.business_sphere_id && professional?.business_spheres && (
            <SphereStatsEnhanced
              sphereId={professional.business_sphere_id}
              sphereName={professional.business_spheres.name}
              chapterId={professional.chapter_id || undefined}
              professionalId={professional.id}
            />
          )}

          {/* Sphere Activity & Synergy */}
          {professional?.business_sphere_id && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <SphereActivityFeed
                sphereId={professional.business_sphere_id}
                chapterId={professional.chapter_id}
                currentProfessionalId={professional.id}
              />
              <SphereSynergyCard professionalId={professional.id} />
            </div>
          )}

          {/* Sphere Reference Button */}
          {professional?.business_sphere_id && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">¿Cliente que necesita otro servicio?</h3>
                    <p className="text-sm text-muted-foreground">
                      Refiere dentro de tu esfera y gana <span className="font-bold text-primary">50 puntos</span> (vs 30 normales)
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowReferenceDialog(true)}
                    size="lg"
                    className="gap-2"
                  >
                    🤝 Referir a mi Esfera
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Premium Banner Advertising */}
          <PremiumBanner location="dashboard" size="horizontal_large" />

          {/* Progress Tracker */}
          <div className="w-full">
            <ProgressTracker goals={goals} />
          </div>

          {/* Gamification Section */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4 lg:mt-6">
            <RankingCard 
              ranking={stats.ranking}
              totalPoints={stats.totalPoints}
              level={{
                name: stats.level.name,
                color: stats.level.color
              }}
            />
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover-scale" onClick={() => navigate('/referrals')}>
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
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover-scale" onClick={() => navigate('/meetings')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Próximas Reuniones</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Reuniones confirmadas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Banner - Bottom */}
          <PremiumBanner location="dashboard" size="horizontal_small" />
        </>
      )}

      {/* Sphere Reference Dialog */}
      {professional?.business_sphere_id && (
        <SphereReferenceDialog
          open={showReferenceDialog}
          onOpenChange={setShowReferenceDialog}
          sphereId={professional.business_sphere_id}
          currentProfessionalId={professional.id}
        />
      )}
    </div>
  );
};

export default Dashboard;
