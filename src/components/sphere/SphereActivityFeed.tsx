import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Briefcase, ArrowRight, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Activity {
  type: "meeting" | "project" | "reference";
  id: string;
  professional: {
    full_name: string;
    photo_url: string | null;
  };
  description: string;
  created_at: string;
}

interface SphereActivityFeedProps {
  sphereId: number;
  chapterId: string | null;
  currentProfessionalId: string;
}

export const SphereActivityFeed = ({
  sphereId,
  chapterId,
  currentProfessionalId
}: SphereActivityFeedProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [sphereId, chapterId, currentProfessionalId]);

  const loadActivities = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get sphere professionals
      const { data: spherePros } = await supabase
        .from("professionals")
        .select("id")
        .eq("business_sphere_id", sphereId)
        .eq("status", "approved");

      if (!spherePros || spherePros.length === 0) {
        setLoading(false);
        return;
      }

      const professionalIds = spherePros.map(p => p.id);

      // Get recent meetings
      const { data: meetings } = await supabase
        .from("meetings")
        .select(`
          id,
          created_at,
          requester:requester_id (
            full_name,
            photo_url
          ),
          recipient:recipient_id (
            full_name,
            photo_url
          )
        `)
        .in("requester_id", professionalIds)
        .in("recipient_id", professionalIds)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      // Get recent project participations
      const { data: projects } = await supabase
        .from("sphere_project_participants")
        .select(`
          id,
          created_at,
          professional:professional_id (
            full_name,
            photo_url
          ),
          project:project_id (
            title
          )
        `)
        .in("professional_id", professionalIds)
        .eq("status", "confirmed")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      // Get recent references
      const { data: references } = await supabase
        .from("sphere_internal_references")
        .select(`
          id,
          created_at,
          referrer:referrer_id (
            full_name,
            photo_url
          ),
          referred:referred_to_id (
            full_name,
            photo_url
          )
        `)
        .eq("business_sphere_id", sphereId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      // Combine and sort activities
      const allActivities: Activity[] = [];

      meetings?.forEach((m: any) => {
        if (m.requester && m.recipient) {
          allActivities.push({
            type: "meeting",
            id: m.id,
            professional: m.requester,
            description: `tiene una reunión con ${m.recipient.full_name}`,
            created_at: m.created_at
          });
        }
      });

      projects?.forEach((p: any) => {
        if (p.professional && p.project) {
          allActivities.push({
            type: "project",
            id: p.id,
            professional: p.professional,
            description: `se unió al proyecto "${p.project.title}"`,
            created_at: p.created_at
          });
        }
      });

      references?.forEach((r: any) => {
        if (r.referrer && r.referred) {
          allActivities.push({
            type: "reference",
            id: r.id,
            professional: r.referrer,
            description: `refirió a ${r.referred.full_name}`,
            created_at: r.created_at
          });
        }
      });

      allActivities.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setActivities(allActivities.slice(0, 8));
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "meeting":
        return <Calendar className="h-4 w-4" />;
      case "project":
        return <Briefcase className="h-4 w-4" />;
      case "reference":
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: Activity["type"]) => {
    switch (type) {
      case "meeting":
        return "bg-blue-500/10 text-blue-500";
      case "project":
        return "bg-purple-500/10 text-purple-500";
      case "reference":
        return "bg-green-500/10 text-green-500";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Actividad de tu Esfera
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay actividad reciente en tu esfera
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activity.professional.photo_url || ""} />
                  <AvatarFallback>
                    {activity.professional.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div
                      className={`p-1.5 rounded-full ${getActivityColor(
                        activity.type
                      )}`}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">
                          {activity.professional.full_name}
                        </span>{" "}
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                          locale: es
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
