import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Feed = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Comunidad</h1>
        <p className="text-muted-foreground">Comparte logros, recursos y conecta con otros miembros</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feed Social</CardTitle>
          <CardDescription>Últimas publicaciones de la comunidad</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay publicaciones aún</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Feed;
