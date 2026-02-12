import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Users, Handshake, DollarSign, ArrowRight, Shield } from "lucide-react";
import { BackgroundImage } from "@/components/ui/background-image";
import heroBg from "@/assets/hero-background.jpg";

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

  const pillars = [
    {
      icon: Users,
      title: "Tu Tribu",
      description: "Un grupo local de profesionales que no compiten entre sí. Cada uno cubre una profesión distinta. Sin duplicados, sin conflictos."
    },
    {
      icon: Handshake,
      title: "Mis Senderos",
      description: "Pasas clientes de tu círculo a miembros de tu grupo. Ellos cierran el trato. Tú cobras tu comisión. Así de directo."
    },
    {
      icon: DollarSign,
      title: "Más Miembros, Más Dinero",
      description: "Cuantas más profesiones cubra tu tribu, más servicios puedes referir. Cada hueco vacío es dinero que se queda en la mesa."
    },
    {
      icon: Shield,
      title: "El Ritual",
      description: "Reuniones 1-a-1 con cada miembro de tu grupo. Conoces su negocio, él conoce el tuyo. La confianza se construye en persona."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <BackgroundImage
        imageUrl={heroBg}
        alt="CONECTOR networking"
        overlayOpacity={0.7}
        overlayColor="hsl(222 47% 11%)"
        className="relative"
      >
        <div className="container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              CONECTOR
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              No es networking. Es un sistema para que otros profesionales te traigan clientes. Y tú a ellos.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-6 group"
              >
                Entrar
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-6"
              >
                Ya tengo cuenta
              </Button>
            </div>
          </div>
        </div>
      </BackgroundImage>

      {/* Pillars */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Cómo funciona
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Un grupo cerrado donde cada miembro es tu comercial. Y tú eres el suyo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pillars.map((pillar, index) => (
            <Card key={index} className="border-2 hover:shadow-lg transition-all">
              <CardContent className="pt-8 pb-8 px-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <pillar.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{pillar.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Tu red ya está generando dinero para otros.
          </h2>
          <p className="text-lg text-muted-foreground">
            La pregunta es si tú estás dentro o fuera.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="text-lg px-12 py-6"
          >
            Quiero entrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
