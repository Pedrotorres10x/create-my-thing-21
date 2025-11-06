import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Meetings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">One-to-Ones</h1>
        <p className="text-muted-foreground">Reuniones individuales con miembros de tu capítulo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximas Reuniones</CardTitle>
          <CardDescription>Agenda y gestiona tus reuniones 1-a-1</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay reuniones programadas</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Meetings;
