import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Zap, Star, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Subscriptions() {
  const { plans, plansLoading, currentSubscription, subscriptionLoading } = useSubscription();

  const freePlan = plans?.find(p => p.slug === 'free');
  const premiumPlan = plans?.find(p => p.slug === 'premium');

  const handleSelectPlan = (planSlug: string) => {
    if (planSlug === 'free') {
      toast.info("Ya estás en el plan gratuito");
      return;
    }
    toast.info("Próximamente: Integración con pagos");
  };

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  const isCurrentFree = currentSubscription?.plan?.slug === 'free';
  const isCurrentPremium = currentSubscription?.plan?.slug === 'premium';

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
          Empieza gratis, crece sin límites
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Tus <span className="text-primary font-semibold">2 primeros tratos son totalmente gratis</span>. 
          A partir del tercero, desbloquea todo por 99€/mes.
        </p>
      </div>

      {/* How it works */}
      <div className="max-w-3xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">1</div>
                <p className="text-sm font-medium">Te registras gratis</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">2</div>
                <p className="text-sm font-medium">2 primeros tratos gratis</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">3</div>
                <p className="text-sm font-medium">3er trato → Premium</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className={`relative flex flex-col ${isCurrentFree ? 'ring-2 ring-primary/30' : ''}`}>
          {isCurrentFree && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="outline">
              Tu plan actual
            </Badge>
          )}
          <CardHeader>
            <CardTitle className="text-2xl">Gratis</CardTitle>
            <CardDescription>{freePlan?.description || 'Empieza sin compromiso'}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            <div>
              <span className="text-4xl font-bold">0€</span>
              <span className="text-muted-foreground ml-1">/mes</span>
            </div>
            <ul className="space-y-3">
              {(freePlan?.features || ['2 primeros tratos GRATIS', 'Acceso completo a la app', 'Perfil profesional', 'Feed y comunidad', 'Después del 2º trato: solo visualización']).map((feature: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              disabled={isCurrentFree}
              onClick={() => handleSelectPlan('free')}
            >
              {isCurrentFree ? "Plan actual" : "Comenzar gratis"}
            </Button>
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className={`relative flex flex-col border-primary shadow-lg ring-2 ring-primary/20 ${isCurrentPremium ? '' : ''}`}>
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-md">
            <Star className="w-3 h-3 mr-1" />
            {isCurrentPremium ? "Tu plan actual" : "Recomendado"}
          </Badge>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              Premium <Zap className="h-5 w-5 text-primary" />
            </CardTitle>
            <CardDescription>{premiumPlan?.description || 'Tratos ilimitados y acceso total'}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            <div>
              <span className="text-4xl font-bold">99€</span>
              <span className="text-muted-foreground ml-1">/mes</span>
            </div>
            <ul className="space-y-3">
              {(premiumPlan?.features || ['Tratos ilimitados', 'Acceso a todos los capítulos de España', 'IA sin límites', 'Soporte prioritario', 'Eventos exclusivos', 'Marketplace premium']).map((feature: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary">
                💡 1 solo trato puede cubrir la cuota de todo el año
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              disabled={isCurrentPremium}
              onClick={() => handleSelectPlan('premium')}
            >
              {isCurrentPremium ? "Plan actual" : "Desbloquear Premium 🚀"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto space-y-4">
        <h2 className="text-xl font-semibold text-center">Preguntas frecuentes</h2>
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="font-medium text-sm">¿Qué cuenta como un "trato"?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Un trato es pasar el contacto de alguien que conoces a un miembro de CONECTOR. Ejemplo: tu primo quiere vender su casa → pasas su contacto al inmobiliario del grupo. Cuando se cierra, ambos ganáis.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="font-medium text-sm">¿Qué pasa después de los 2 tratos gratis?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sigues usando la app con normalidad: ves el feed, las recomendaciones, las oportunidades... pero no puedes lanzar ni recibir nuevos tratos. Para desbloquear tratos ilimitados → Premium 99€/mes.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="font-medium text-sm">¿Puedo cancelar en cualquier momento?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sí, sin permanencia. Cancelas y sigues usando la app, pero sin poder hacer tratos.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
