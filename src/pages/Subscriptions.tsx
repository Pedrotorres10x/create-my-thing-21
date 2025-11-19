import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionPlanCard } from "@/components/subscription/SubscriptionPlanCard";
import { AIUsageIndicator } from "@/components/subscription/AIUsageIndicator";
import { PlanComparison } from "@/components/subscription/PlanComparison";
import { SocialProof } from "@/components/subscription/SocialProof";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PremiumBanner } from "@/components/advertising/PremiumBanner";

export default function Subscriptions() {
  const { plans, plansLoading, currentSubscription, subscriptionLoading } = useSubscription();

  const handleSelectPlan = (planSlug: string) => {
    if (planSlug === 'free') {
      toast.info("Ya estás en el plan gratuito");
      return;
    }
    
    // TODO: Integrate with Stripe payment
    toast.info("Próximamente: Integración con pagos");
  };

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[400px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="text-center space-y-3 sm:space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          +500 pros activos en la red
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">Elige tu Plan 🚀</h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          Cada contacto puede abrirte puertas de miles de euros. <br className="hidden sm:block" />
          <span className="text-primary font-medium">¿Hasta dónde quieres llegar? 💼</span>
        </p>
      </div>

      {currentSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Tu Plan Actual: {currentSubscription.plan.name}</CardTitle>
            <CardDescription>
              {currentSubscription.status === 'active' ? 'Plan activo' : 'Plan inactivo'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AIUsageIndicator />
          </CardContent>
        </Card>
      )}

      {/* Premium Banner */}
      <PremiumBanner location="dashboard" size="horizontal_large" />

      <Tabs defaultValue="monthly" className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="monthly">Mensual</TabsTrigger>
            <TabsTrigger value="yearly" className="relative">
              Anual
              <Badge className="absolute -top-2 -right-2 text-xs bg-primary">-17%</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="monthly" className="mt-6 sm:mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {plans?.map((plan) => (
              <SubscriptionPlanCard
                key={plan.id}
                name={plan.name}
                description={plan.description}
                priceMonthly={plan.price_monthly}
                priceYearly={plan.price_yearly}
                features={plan.features || []}
                isCurrentPlan={currentSubscription?.plan.id === plan.id}
                isRecommended={plan.slug === 'regional'}
                onSelect={() => handleSelectPlan(plan.slug)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="yearly" className="mt-6 sm:mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {plans?.map((plan) => (
              <SubscriptionPlanCard
                key={plan.id}
                name={plan.name}
                description={plan.description}
                priceMonthly={plan.price_yearly ? plan.price_yearly / 12 : plan.price_monthly}
                priceYearly={plan.price_yearly}
                features={plan.features || []}
                isCurrentPlan={currentSubscription?.plan.id === plan.id}
                isRecommended={plan.slug === 'regional'}
                onSelect={() => handleSelectPlan(plan.slug)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <SocialProof />
      
      <PlanComparison />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚀 El Todoterreno: Tu Pase VIP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🗺️</span>
              <div>
                <p className="font-medium">España entera es tu playground</p>
                <p className="text-sm text-muted-foreground">Las 17 comunidades sin límites. Cero fronteras</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <p className="font-medium">Cada región = Más oportunidades</p>
                <p className="text-sm text-muted-foreground">Multiplica x17 tus posibilidades de cerrar negocios</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-medium">ROI del bueno</p>
                <p className="text-sm text-muted-foreground">Nuestros miembros recuperan 3.5x la inversión en 6 meses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>¿Tu empresa va a otro nivel? 🏢</CardTitle>
            <CardDescription>
              Si necesitas algo a medida para tu organización, hablamos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Soluciones enterprise con soporte dedicado, integraciones custom y todo lo que necesites.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
