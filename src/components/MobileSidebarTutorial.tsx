import { useState, useEffect } from "react";
import { Menu, Home, UserCircle, Handshake, Send, Users, Calendar, MessageSquare, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

const TUTORIAL_KEY = "conector-sidebar-tutorial-done";

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: TutorialStep[] = [
  {
    icon: <Menu className="h-6 w-6" />,
    title: "Menú lateral",
    description: "Haz clic en el icono ☰ arriba a la izquierda para abrir y cerrar el menú en cualquier momento.",
  },
  {
    icon: <Home className="h-6 w-6" />,
    title: "Alic.IA",
    description: "Tu asistente inteligente. Aquí encuentras tu tablero principal y puedes chatear con Alic.IA.",
  },
  {
    icon: <UserCircle className="h-6 w-6" />,
    title: "Mi Perfil",
    description: "Edita tu información profesional, foto y especialización.",
  },
  {
    icon: <Handshake className="h-6 w-6" />,
    title: "Mis Invitados",
    description: "Gestiona las referencias que envías y recibes de otros profesionales.",
  },
  {
    icon: <Send className="h-6 w-6" />,
    title: "Recomendación",
    description: "Recomienda clientes a compañeros de tu tribu y gana puntos.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Mi Tribu",
    description: "Explora los miembros de tu capítulo y conecta con profesionales afines.",
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: "El Cafelito",
    description: "Agenda reuniones 1-a-1 con miembros de tu tribu para generar confianza.",
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Somos Únicos",
    description: "Descubre tu ranking, logros y el reconocimiento dentro de la comunidad.",
  },
];

export function MobileSidebarTutorial() {
  const [show, setShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { setOpen } = useSidebar();

  useEffect(() => {
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    setShow(false);
    // Open sidebar so user sees the menu after the tutorial
    setOpen(true);
  };

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    setShow(false);
  };

  if (!show) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleSkip}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4 mb-6 sm:mb-0 animate-in slide-in-from-bottom-4 duration-300">
        <div className="rounded-2xl border border-border/60 bg-background shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-r-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {currentStep + 1} / {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 -mr-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 pt-4 pb-5 flex flex-col items-center text-center gap-3">
            {/* Icon spotlight */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-150 animate-pulse" />
              <div className="relative h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/30">
                {step.icon}
              </div>
            </div>

            <h3 className="text-lg font-bold text-foreground mt-1">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
              {step.description}
            </p>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 text-xs"
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                Atrás
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 h-10 text-xs gap-1.5"
              onClick={handleNext}
            >
              {isLast ? "¡Empezar!" : "Siguiente"}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 pb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-5 bg-primary"
                    : i < currentStep
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
