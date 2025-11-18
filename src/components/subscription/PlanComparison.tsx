import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";

const features = [
  {
    category: "Acceso a Capítulos",
    items: [
      { name: "Capítulo local", free: true, provincial: true, regional: true, national: true },
      { name: "Toda la provincia", free: false, provincial: true, regional: true, national: true },
      { name: "Toda la comunidad autónoma", free: false, provincial: false, regional: true, national: true },
      { name: "Toda España (17 comunidades)", free: false, provincial: false, regional: false, national: true },
    ]
  },
  {
    category: "Networking",
    items: [
      { name: "One-to-Ones semanales", free: "1/mes", provincial: "1/semana", regional: "2/semana", national: "Ilimitados" },
      { name: "Referidos mensuales", free: "1", provincial: "4", regional: "4", national: "Ilimitados" },
      { name: "Invitados al mes", free: "0", provincial: "1", regional: "1", national: "Ilimitados" },
      { name: "Eventos nacionales prioritarios", free: false, provincial: false, regional: false, national: true },
      { name: "Badge especial Nacional", free: false, provincial: false, regional: false, national: true },
    ]
  },
  {
    category: "Herramientas",
    items: [
      { name: "Mensajes AI asistente", free: "10/mes", provincial: "50/mes", regional: "200/mes", national: "Ilimitados" },
      { name: "Analytics avanzados", free: false, provincial: false, regional: true, national: true },
      { name: "Marketplace destacado", free: false, provincial: false, regional: false, national: true },
    ]
  }
];

export function PlanComparison() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">Comparación Detallada de Planes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-semibold">Característica</th>
                <th className="text-center p-4 font-semibold text-muted-foreground">Gratis</th>
                <th className="text-center p-4 font-semibold text-muted-foreground">Provincial</th>
                <th className="text-center p-4 font-semibold text-muted-foreground">Autonómico</th>
                <th className="text-center p-4 font-semibold bg-primary/10 text-primary">Nacional 🚀</th>
              </tr>
            </thead>
            <tbody>
              {features.map((category, categoryIndex) => (
                <>
                  <tr key={categoryIndex} className="border-b bg-muted/30">
                    <td colSpan={5} className="p-3 font-semibold text-sm">
                      {category.category}
                    </td>
                  </tr>
                  {category.items.map((item, itemIndex) => (
                    <tr key={`${categoryIndex}-${itemIndex}`} className="border-b hover:bg-muted/20">
                      <td className="p-4 text-sm">{item.name}</td>
                      <td className="p-4 text-center">
                        {typeof item.free === 'boolean' ? (
                          item.free ? <Check className="w-5 h-5 text-muted-foreground mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                        ) : (
                          <span className="text-sm text-muted-foreground">{item.free}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof item.provincial === 'boolean' ? (
                          item.provincial ? <Check className="w-5 h-5 text-muted-foreground mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                        ) : (
                          <span className="text-sm text-muted-foreground">{item.provincial}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof item.regional === 'boolean' ? (
                          item.regional ? <Check className="w-5 h-5 text-muted-foreground mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                        ) : (
                          <span className="text-sm text-muted-foreground">{item.regional}</span>
                        )}
                      </td>
                      <td className="p-4 text-center bg-primary/5">
                        {typeof item.national === 'boolean' ? (
                          item.national ? <Check className="w-5 h-5 text-primary mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                        ) : (
                          <span className="text-sm font-medium text-primary">{item.national}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
