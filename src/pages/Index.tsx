import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Users, Trophy, Handshake, Store, ArrowRight, Sparkles, Target, Rocket } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-2xl font-bold">CONECTOR</div>
      </div>
    );
  }

  const features = [
    {
      icon: Users,
      title: "Red Profesional",
      description: "Conecta con profesionales de tu sector y ciudad"
    },
    {
      icon: Trophy,
      title: "Sistema de Puntos",
      description: "Gana puntos por referidos y sube de nivel"
    },
    {
      icon: Handshake,
      title: "One-to-Ones",
      description: "Agenda reuniones con otros miembros"
    },
    {
      icon: Store,
      title: "Marketplace",
      description: "Ofrece y encuentra servicios profesionales"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-12">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <Badge className="text-sm px-4 py-2" variant="secondary">
            <Sparkles className="w-3 h-3 mr-2" />
            Tu Red Profesional de Crecimiento
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Bienvenido a{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              CONECTOR
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            La plataforma que conecta, impulsa y recompensa tu crecimiento empresarial a través de una comunidad activa de profesionales
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6 group"
            >
              Comenzar Ahora
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6"
            >
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Qué puedes hacer en CONECTOR?
          </h2>
          <p className="text-muted-foreground text-lg">
            Todo lo que necesitas para expandir tu red profesional
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:shadow-lg transition-all hover:scale-105">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-8 md:p-12">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Crece</h3>
                <p className="text-muted-foreground">
                  Expande tu red de contactos profesionales
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Gana</h3>
                <p className="text-muted-foreground">
                  Acumula puntos y alcanza nuevos niveles
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Conecta</h3>
                <p className="text-muted-foreground">
                  Colabora con profesionales de tu sector
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Final */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            ¿Listo para crecer profesionalmente?
          </h2>
          <p className="text-lg text-muted-foreground">
            Únete a la comunidad de profesionales que están transformando su negocio
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="text-lg px-12 py-6"
          >
            Únete Ahora Gratis
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
