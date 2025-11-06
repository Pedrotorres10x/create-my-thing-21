import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Referrals = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referidos</h1>
        <p className="text-muted-foreground">Gestiona tus referidos enviados y recibidos</p>
      </div>

      <Tabs defaultValue="sent" className="w-full">
        <TabsList>
          <TabsTrigger value="sent">Enviados</TabsTrigger>
          <TabsTrigger value="received">Recibidos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referidos Enviados</CardTitle>
              <CardDescription>Referidos que has enviado a otros profesionales</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No hay referidos enviados aún</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referidos Recibidos</CardTitle>
              <CardDescription>Referidos que has recibido de otros profesionales</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No hay referidos recibidos aún</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Referrals;
