import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Rankings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rankings</h1>
        <p className="text-muted-foreground">Clasificaciones de los mejores profesionales</p>
      </div>

      <Tabs defaultValue="chapter" className="w-full">
        <TabsList>
          <TabsTrigger value="chapter">Mi Capítulo</TabsTrigger>
          <TabsTrigger value="global">Global</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chapter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking del Capítulo</CardTitle>
              <CardDescription>Top profesionales de tu capítulo este semestre</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No hay datos de ranking aún</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="global" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Global</CardTitle>
              <CardDescription>Top profesionales a nivel nacional</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No hay datos de ranking aún</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Rankings;
