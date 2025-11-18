import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Zap, Users, Award } from "lucide-react";
import confetti from "canvas-confetti";

export interface Achievement {
  title: string;
  description: string;
  type: "level_up" | "points" | "referral" | "meeting" | "streak";
  icon: "trophy" | "star" | "zap" | "users" | "award";
  points?: number;
  level?: string;
}

interface AchievementModalProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const iconMap = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  users: Users,
  award: Award,
};

export const AchievementModal = ({ achievement, onClose }: AchievementModalProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsOpen(true);
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [achievement]);

  if (!achievement) return null;

  const Icon = iconMap[achievement.icon];

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 animate-scale-in">
            <Icon className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-center text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-fade-in">
            {achievement.title}
          </DialogTitle>
          <DialogDescription className="text-center text-lg pt-2 animate-fade-in">
            {achievement.description}
          </DialogDescription>
          
          {achievement.points && (
            <div className="flex items-center justify-center gap-2 pt-4 animate-scale-in">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold text-primary">
                +{achievement.points} puntos
              </span>
            </div>
          )}
          
          {achievement.level && (
            <div className="mt-4 p-4 bg-primary/10 rounded-lg animate-scale-in">
              <p className="text-center text-sm font-semibold text-primary">
                Nuevo nivel: {achievement.level}
              </p>
            </div>
          )}
        </DialogHeader>
        
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleClose} 
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            ¡Genial!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
