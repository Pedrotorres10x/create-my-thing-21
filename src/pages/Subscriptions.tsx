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
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Únete a más de 500 profesionales activos
        </div>
        <h1 className="text-4xl font-bold mb-2">Invierte en tu Red de Networking</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Cada contacto de calidad puede generar oportunidades de miles de euros. <br />
          <span className="text-primary font-medium">¿Cuánto vale expandir tu red a nivel nacional?</span>
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

        <TabsContent value="monthly" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <TabsContent value="yearly" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              🎯 Por qué el Plan Nacional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤝</span>
              <div>
                <p className="font-medium">Acceso ilimitado a toda España</p>
                <p className="text-sm text-muted-foreground">Conecta con profesionales en las 17 comunidades autónomas</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💼</span>
              <div>
                <p className="font-medium">Oportunidades multiplicadas</p>
                <p className="text-sm text-muted-foreground">Cada región multiplica tus posibilidades de negocio</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📈</span>
              <div>
                <p className="font-medium">ROI comprobado</p>
                <p className="text-sm text-muted-foreground">Miembros reportan 3.5x retorno en 6 meses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>¿Necesitas un plan personalizado?</CardTitle>
            <CardDescription>
              Si tu organización necesita características adicionales o un plan a medida, contáctanos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ofrecemos soluciones empresariales con soporte dedicado, integraciones personalizadas y más.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
