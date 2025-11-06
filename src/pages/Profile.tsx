import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Profile = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información profesional</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil Profesional</CardTitle>
          <CardDescription>Completa tu perfil para activar tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Formulario de perfil en desarrollo...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
