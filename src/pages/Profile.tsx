import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/ProfileForm";

const Profile = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">Completa tu información profesional</p>
      </div>

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
  );
};

export default Profile;
