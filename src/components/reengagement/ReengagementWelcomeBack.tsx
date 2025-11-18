import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Gift, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActivityTracking {
  reengagement_stage: string;
  inactivity_days: number;
  activity_score: number;
}

export const ReengagementWelcomeBack = () => {
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState<ActivityTracking | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkReengagementStatus();
  }, []);

  const checkReengagementStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!professional) return;

      const { data: activityData } = await supabase
        .from("user_activity_tracking")
        .select("reengagement_stage, inactivity_days, activity_score")
        .eq("professional_id", professional.id)
        .single();

      if (activityData && activityData.reengagement_stage === "at_risk") {
        const lastShown = localStorage.getItem("reengagement_modal_shown");
        const today = new Date().toDateString();
        
        if (lastShown !== today) {
          setTracking(activityData);
          setOpen(true);
          localStorage.setItem("reengagement_modal_shown", today);
        }
      }
    } catch (error) {
      console.error("Error checking reengagement status:", error);
    }
  };

  const handleAction = (action: string) => {
    setOpen(false);
    
    switch(action) {
      case "feed":
        navigate("/feed");
        break;
      case "marketplace":
        navigate("/marketplace");
        break;
      case "meetings":
        navigate("/meetings");
        break;
      case "referrals":
        navigate("/referrals");
        break;
    }
  };

  if (!tracking) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            ¡Te extrañamos! 👋
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Hace {tracking.inactivity_days} días que no interactúas con la comunidad
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-muted-foreground mb-3">
              Tu score de actividad actual es <span className="font-bold text-primary">{tracking.activity_score}/100</span>
            </p>
            <p className="text-sm">
              ¡No pierdas tu racha! Mantente activo para desbloquear beneficios exclusivos y mantener tu visibilidad en la red.
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => handleAction("feed")}
            >
              <Users className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-semibold">Ver Feed</p>
                <p className="text-xs text-muted-foreground">Conecta con la comunidad</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => handleAction("marketplace")}
            >
              <Gift className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-semibold">Marketplace</p>
                <p className="text-xs text-muted-foreground">Ofrece tus servicios</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => handleAction("meetings")}
            >
              <Zap className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-semibold">Reuniones</p>
                <p className="text-xs text-muted-foreground">Agenda reuniones</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => handleAction("referrals")}
            >
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-semibold">Referir</p>
                <p className="text-xs text-muted-foreground">Gana puntos extra</p>
              </div>
            </Button>
          </div>

          <div className="bg-accent/50 rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold mb-2">💡 Consejo Pro</p>
            <p className="text-xs text-muted-foreground">
              Realiza al menos 3 acciones esta semana (crear post, comentar, contactar ofertas) para mejorar tu score de actividad y desbloquear beneficios premium.
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={() => setOpen(false)}
          >
            ¡Entendido, vamos!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
