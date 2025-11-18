import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/ProfileForm";
import { ProfileProgress } from "@/components/ProfileProgress";
import { LevelBenefitsCard } from "@/components/LevelBenefitsCard";
import { UserPenaltiesAlert } from "@/components/UserPenaltiesAlert";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Profile = () => {
  const { user } = useAuth();
  const [professional, setProfessional] = useState<any>(null);

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
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">Completa tu información profesional</p>
      </div>

      {professional && (
        <UserPenaltiesAlert professionalId={professional.id} />
      )}

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
            <LevelBenefitsCard 
              currentLevel={Math.floor(professional.total_points / 100) + 1}
              currentPoints={professional.total_points}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
