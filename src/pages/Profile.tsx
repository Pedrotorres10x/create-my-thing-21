import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/ProfileForm";
import { ProfileProgress } from "@/components/ProfileProgress";
import { LevelBenefitsCard } from "@/components/LevelBenefitsCard";
import { UserPenaltiesAlert } from "@/components/UserPenaltiesAlert";
import { AppealsList } from "@/components/appeals/AppealsList";
import { CreateComplaintDialog } from "@/components/appeals/CreateComplaintDialog";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";
import { ThanksReputationCard } from "@/components/profile/ThanksReputationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import Subscriptions from "./Subscriptions";

const Profile = () => {
  const { user } = useAuth();
  const [professional, setProfessional] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";

  useEffect(() => {
    if (user) {
      fetchProfessional();
    }
  }, [user]);

  const fetchProfessional = async () => {
    const { data } = await supabase
      .from("professionals")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    setProfessional(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Mi Perfil</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Tu marca profesional en CONECTOR</p>
      </div>

      {professional && (
        <UserPenaltiesAlert professionalId={professional.id} />
      )}

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="plan">Mi Plan</TabsTrigger>
          <TabsTrigger value="appeals">Apelaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileProgress />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Perfil Profesional</CardTitle>
                  <CardDescription>Completa todos los campos para enviar tu solicitud</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileForm />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {professional && (
                <>
                  <ThanksReputationCard professionalId={professional.id} />
                  <BadgeGrid professionalId={professional.id} />
                  <LevelBenefitsCard 
                    currentLevel={Math.floor(professional.total_points / 100) + 1}
                    currentPoints={professional.total_points}
                  />
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plan">
          <Subscriptions />
        </TabsContent>

        <TabsContent value="appeals">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Mis Apelaciones</CardTitle>
                  <CardDescription>
                    Revisa el estado de tus quejas y apelaciones
                  </CardDescription>
                </div>
                {professional && (
                  <CreateComplaintDialog professionalId={professional.id} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {professional ? (
                <AppealsList professionalId={professional.id} />
              ) : (
                <p className="text-muted-foreground">Cargando...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
