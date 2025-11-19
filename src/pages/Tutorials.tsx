import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Rocket, 
  Users, 
  Target, 
  TrendingUp, 
  Heart, 
  Zap, 
  Award, 
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  Gift,
  Calendar,
  Store,
  MessageSquare,
  Trophy,
  UserPlus
} from "lucide-react";

const Tutorials = () => {
  const [activeTab, setActiveTab] = useState<string>("philosophy");

  const philosophyPoints = [
    {
      icon: Heart,
      title: "Relaciones Auténticas",
      description: "No se trata de coleccionar contactos, sino de crear conexiones genuinas y duraderas"
    },
    {
      icon: Users,
      title: "Comunidad Colaborativa",
      description: "Juntos llegamos más lejos. El éxito de uno es el éxito de todos"
    },
    {
      icon: Target,
      title: "Networking con Propósito",
      description: "Cada interacción tiene un objetivo: aprender, enseñar, colaborar o crecer"
    },
    {
      icon: TrendingUp,
      title: "Crecimiento Continuo",
      description: "Tu nivel y puntos reflejan tu compromiso con la red"
    }
  ];

  const features = [
    {
      icon: UserPlus,
      title: "Sistema de Referidos",
      description: "Invita a profesionales de calidad y gana puntos. Cada referido aprobado suma a tu red",
      steps: ["Copia tu enlace único", "Comparte con profesionales afines", "Gana puntos cuando se registren y completen su perfil"]
    },
    {
      icon: Calendar,
      title: "One-to-Ones",
      description: "Reuniones 1:1 personalizadas para conocer mejor a tu red",
      steps: ["Solicita reuniones con miembros de tu capítulo", "Define objetivos claros", "Construye relaciones significativas"]
    },
    {
      icon: Store,
      title: "Plaza Premium",
      description: "Ofrece y solicita servicios dentro de la comunidad",
      steps: ["Publica lo que ofreces", "Busca lo que necesitas", "Colabora con otros miembros"]
    },
    {
      icon: MessageSquare,
      title: "Feed Comunitario",
      description: "Comparte logros, aprende de otros y mantente conectado",
      steps: ["Publica contenido de valor", "Comenta y apoya a otros", "Mantente visible y activo"]
    },
    {
      icon: Trophy,
      title: "Sistema de Niveles",
      description: "Tu actividad y aportaciones se reconocen con puntos y niveles",
      steps: ["Completa tu perfil (+50 pts)", "Refiere profesionales (+30 pts por aprobado)", "Asiste a reuniones (+20 pts)", "Participa activamente (+10-50 pts)"]
    }
  ];

  const quickStart = [
    {
      step: 1,
      title: "Completa tu Perfil",
      description: "Sube foto, describe tu experiencia y especialidad. ¡Tu primera gran impresión!",
      points: 50,
      action: "/profile"
    },
    {
      step: 2,
      title: "Explora tu Capítulo",
      description: "Conoce a los miembros de tu región. Cada capítulo es una familia profesional",
      points: 0,
      action: "/chapter"
    },
    {
      step: 3,
      title: "Solicita tu Primera Reunión",
      description: "Conecta 1:1 con alguien interesante. El networking real sucede aquí",
      points: 20,
      action: "/meetings"
    },
    {
      step: 4,
      title: "Comparte tu Enlace",
      description: "Invita a profesionales de calidad. Crece tu red y suma puntos",
      points: 30,
      action: "/referrals"
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-primary mb-4">
          <Rocket className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          ¡Bienvenido a CONECTOR! 🚀
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Tu plataforma de networking profesional con propósito. Aprende cómo funciona y comienza a crecer tu red.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant={activeTab === "philosophy" ? "default" : "outline"}
          onClick={() => setActiveTab("philosophy")}
          className="gap-2"
        >
          <Lightbulb className="h-4 w-4" />
          Filosofía
        </Button>
        <Button
          variant={activeTab === "quickstart" ? "default" : "outline"}
          onClick={() => setActiveTab("quickstart")}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          Inicio Rápido
        </Button>
        <Button
          variant={activeTab === "features" ? "default" : "outline"}
          onClick={() => setActiveTab("features")}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Funcionalidades
        </Button>
      </div>

      {/* Philosophy Section */}
      {activeTab === "philosophy" && (
        <div className="space-y-6 animate-slide-up">
          <Card className="shadow-card border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Heart className="h-6 w-6 text-primary" />
                Nuestra Filosofía
              </CardTitle>
              <CardDescription className="text-base">
                CONECTOR no es solo una plataforma, es un movimiento de networking con propósito
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                {philosophyPoints.map((point, index) => {
                  const Icon = point.icon;
                  return (
                    <Card key={index} className="shadow-card hover:shadow-glow transition-all duration-300 border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg gradient-primary">
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{point.title}</h3>
                            <p className="text-sm text-muted-foreground">{point.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Gift className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Dar para Crecer</h3>
                      <p className="text-muted-foreground">
                        Nuestra filosofía central: <strong className="text-foreground">"Quien da, recibe"</strong>. 
                        Cuando ayudas a otros a tener éxito, tú también creces. CONECTOR recompensa la generosidad, 
                        la colaboración y el compromiso con la comunidad.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Start Section */}
      {activeTab === "quickstart" && (
        <div className="space-y-6 animate-slide-up">
          <Card className="shadow-card border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Zap className="h-6 w-6 text-primary" />
                Primeros Pasos
              </CardTitle>
              <CardDescription className="text-base">
                Sigue estos 4 pasos para aprovechar CONECTOR al máximo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quickStart.map((item) => (
                  <Card key={item.step} className="shadow-card hover:shadow-glow transition-all duration-300">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xl">
                            {item.step}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="font-semibold text-lg">{item.title}</h3>
                            {item.points > 0 && (
                              <Badge variant="secondary" className="gap-1">
                                <Award className="h-3 w-3" />
                                +{item.points} pts
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mb-4">{item.description}</p>
                          <Button 
                            size="sm" 
                            className="gap-2"
                            onClick={() => window.location.href = item.action}
                          >
                            Ir ahora
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">💡 Consejo Pro</h3>
                  <p className="text-muted-foreground">
                    Los primeros 30 días son clave. Completa tu perfil, asiste a eventos, 
                    solicita reuniones y participa activamente. ¡Tu nivel subirá rápidamente 
                    y tu red se expandirá de forma exponencial!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features Section */}
      {activeTab === "features" && (
        <div className="space-y-6 animate-slide-up">
          <Card className="shadow-card border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="h-6 w-6 text-primary" />
                Funcionalidades Principales
              </CardTitle>
              <CardDescription className="text-base">
                Explora todas las herramientas para maximizar tu networking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg gradient-primary">
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold">{feature.title}</div>
                            <div className="text-sm text-muted-foreground">{feature.description}</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-14 pr-4 space-y-3 pt-2">
                          <p className="font-medium text-sm">Cómo funciona:</p>
                          <ul className="space-y-2">
                            {feature.steps.map((step, stepIndex) => (
                              <li key={stepIndex} className="flex items-start gap-2">
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-primary to-secondary text-white shadow-glow">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Award className="h-12 w-12 mx-auto" />
                <h3 className="text-2xl font-bold">Sistema de Puntos y Niveles</h3>
                <p className="text-white/90 max-w-2xl mx-auto">
                  Cada acción cuenta. Completa tu perfil, refiere miembros, asiste a reuniones 
                  y participa en la comunidad para subir de nivel y desbloquear beneficios exclusivos.
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <Badge variant="secondary" className="text-sm py-1 px-3">Bronce 🥉</Badge>
                  <Badge variant="secondary" className="text-sm py-1 px-3">Plata 🥈</Badge>
                  <Badge variant="secondary" className="text-sm py-1 px-3">Oro 🥇</Badge>
                  <Badge variant="secondary" className="text-sm py-1 px-3">Platino 💎</Badge>
                  <Badge variant="secondary" className="text-sm py-1 px-3">Diamante 💠</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer CTA */}
      <Card className="shadow-glow border-2 border-primary/20">
        <CardContent className="pt-6 text-center space-y-4">
          <Rocket className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-2xl font-bold">¿Listo para Conectar?</h3>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Ahora que conoces cómo funciona CONECTOR, ¡es hora de ponerlo en práctica! 
            Completa tu perfil y empieza a construir tu red profesional.
          </p>
          <Button 
            size="lg" 
            className="gap-2 gradient-primary"
            onClick={() => window.location.href = "/dashboard"}
          >
            Ir al inicio
            <ArrowRight className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tutorials;
