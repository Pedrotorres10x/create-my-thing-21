import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const TUTORIAL_KEY = "conector-sidebar-tutorial-done";

export interface TutorialStepInfo {
  url: string;
  title: string;
  description: string;
}

const TUTORIAL_STEPS: TutorialStepInfo[] = [
  { url: "/dashboard", title: "Alic.IA", description: "Tu asistente inteligente. Aquí encuentras tu tablero principal y puedes chatear con Alic.IA." },
  { url: "/profile", title: "Mi Perfil", description: "Edita tu información profesional, foto y especialización." },
  { url: "/referrals", title: "Mis Invitados", description: "Gestiona las referencias que envías y recibes de otros profesionales." },
  { url: "/recomendacion", title: "Recomendación", description: "Recomienda clientes a compañeros de tu tribu y gana puntos." },
  { url: "/mi-tribu", title: "Mi Tribu", description: "Explora los miembros de tu capítulo y conecta con profesionales afines." },
  { url: "/meetings", title: "El Cafelito", description: "Agenda reuniones 1-a-1 con miembros de tu tribu para generar confianza." },
  { url: "/somos-unicos", title: "Somos Únicos", description: "Descubre tu ranking, logros y el reconocimiento dentro de la comunidad." },
];

interface SidebarTutorialContextType {
  active: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepInfo: TutorialStepInfo | null;
  /** The URL of the item that should be highlighted */
  highlightedUrl: string | null;
  /** Whether we're showing the explanation (after click) */
  showingExplanation: boolean;
  /** Called when the user clicks the highlighted sidebar item */
  onHighlightedClick: () => void;
  /** Dismiss explanation and advance to next step */
  onDismissExplanation: () => void;
  /** Skip the entire tutorial */
  skipTutorial: () => void;
}

const SidebarTutorialContext = createContext<SidebarTutorialContextType>({
  active: false,
  currentStep: 0,
  totalSteps: 0,
  currentStepInfo: null,
  highlightedUrl: null,
  showingExplanation: false,
  onHighlightedClick: () => {},
  onDismissExplanation: () => {},
  skipTutorial: () => {},
});

export const useSidebarTutorial = () => useContext(SidebarTutorialContext);

export function SidebarTutorialProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showingExplanation, setShowingExplanation] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      const timer = setTimeout(() => setActive(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    setActive(false);
    setShowingExplanation(false);
  }, []);

  const onHighlightedClick = useCallback(() => {
    setShowingExplanation(true);
  }, []);

  const onDismissExplanation = useCallback(() => {
    setShowingExplanation(false);
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  }, [currentStep, finish]);

  const stepInfo = active ? TUTORIAL_STEPS[currentStep] : null;

  return (
    <SidebarTutorialContext.Provider
      value={{
        active,
        currentStep,
        totalSteps: TUTORIAL_STEPS.length,
        currentStepInfo: stepInfo,
        highlightedUrl: stepInfo?.url ?? null,
        showingExplanation,
        onHighlightedClick,
        onDismissExplanation,
        skipTutorial: finish,
      }}
    >
      {children}
    </SidebarTutorialContext.Provider>
  );
}
