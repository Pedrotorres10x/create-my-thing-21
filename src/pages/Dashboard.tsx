import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido a CONECTOR</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Referidos Enviados</CardTitle>
            <CardDescription>Total de referidos que has enviado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referidos Recibidos</CardTitle>
            <CardDescription>Total de referidos recibidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gratificaciones</CardTitle>
            <CardDescription>Total ganado en comisiones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Puntos</CardTitle>
            <CardDescription>Tu ranking actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
