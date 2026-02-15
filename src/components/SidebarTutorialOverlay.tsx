import { useSidebarTutorial } from "./SidebarTutorialContext";
import { useSidebar } from "@/components/ui/sidebar";
import { useEffect } from "react";
import { X, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Renders:
 * 1. A dark overlay when tutorial is active (blocks interaction except sidebar)
 * 2. An explanation card when user clicks the highlighted item
 */
export function SidebarTutorialOverlay() {
  const {
    active,
    currentStep,
    totalSteps,
    currentStepInfo,
    showingExplanation,
    onDismissExplanation,
    skipTutorial,
  } = useSidebarTutorial();
  const { setOpen } = useSidebar();

  // Keep sidebar open during tutorial
  useEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active, setOpen]);

  if (!active) return null;

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLast = currentStep === totalSteps - 1;

  return (
    <>
      {/* Dark overlay over main content area — sidebar stays interactive */}
      <div
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={skipTutorial}
      />

      {/* Floating hint when NOT showing explanation */}
      {!showingExplanation && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[101] animate-fade-in">
          <div className="flex items-center gap-3 bg-background/95 backdrop-blur-md border border-border/60 rounded-full px-5 py-2.5 shadow-xl">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">
              Pulsa en <strong className="text-primary">{currentStepInfo?.title}</strong> en el menú
            </span>
            <span className="text-[11px] text-muted-foreground">
              {currentStep + 1}/{totalSteps}
            </span>
            <button onClick={skipTutorial} className="text-muted-foreground/50 hover:text-foreground ml-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Explanation modal after clicking */}
      {showingExplanation && currentStepInfo && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={onDismissExplanation}
          />
          <div className="relative z-10 w-full max-w-sm animate-scale-in">
            <div className="rounded-2xl border border-border/60 bg-background shadow-2xl overflow-hidden">
              {/* Progress */}
              <div className="h-1 bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out rounded-r-full"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="px-6 pt-5 pb-6 text-center">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  <span>{currentStep + 1} / {totalSteps}</span>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">{currentStepInfo.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {currentStepInfo.description}
                </p>

                <Button
                  className="w-full h-11 gap-2"
                  onClick={onDismissExplanation}
                >
                  {isLast ? "🚀 ¡Empezar!" : "Siguiente"}
                  {!isLast && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>

              {/* Dots */}
              <div className="flex justify-center gap-1.5 pb-4">
                {Array.from({ length: totalSteps }).map((_, i) => (
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
      )}
    </>
  );
}
