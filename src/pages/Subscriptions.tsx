import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionPlanCard } from "@/components/subscription/SubscriptionPlanCard";
import { AIUsageIndicator } from "@/components/subscription/AIUsageIndicator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div>
        <h1 className="text-4xl font-bold mb-2">Planes de Suscripción</h1>
        <p className="text-muted-foreground">
          Elige el plan que mejor se adapte a tus necesidades de networking
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
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="monthly">Mensual</TabsTrigger>
          <TabsTrigger value="yearly">Anual</TabsTrigger>
        </TabsList>

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
  );
}
