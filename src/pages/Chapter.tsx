import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Chapter = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Capítulo</h1>
        <p className="text-muted-foreground">Miembros y actividades de tu capítulo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Capítulo</CardTitle>
          <CardDescription>Detalles de tu equipo local</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Serás asignado a un capítulo según tu ubicación
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chapter;
