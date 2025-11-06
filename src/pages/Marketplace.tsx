import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Marketplace = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground">Ofertas y servicios de la comunidad</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ofertas Disponibles</CardTitle>
          <CardDescription>Servicios ofrecidos por los miembros</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay ofertas disponibles</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Marketplace;
