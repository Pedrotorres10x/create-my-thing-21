import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Star, Trophy, Gift, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelBenefitsCardProps {
  currentLevel: number;
  currentPoints: number;
}

const levelBenefits = [
  {
    level: 1,
    name: "Principiante",
    minPoints: 0,
    benefits: [
      "Acceso al feed de publicaciones",
      "Crear perfil profesional",
      "Ver ofertas del marketplace",
    ],
    icon: Star,
    color: "text-gray-500",
  },
  {
    level: 2,
    name: "Activo",
    minPoints: 100,
    benefits: [
      "Todo lo anterior",
      "Publicar en el marketplace",
      "Solicitar reuniones 1-1",
      "Comentar en publicaciones",
    ],
    icon: Zap,
    color: "text-blue-500",
  },
  {
    level: 3,
    name: "Comprometido",
    minPoints: 500,
    benefits: [
      "Todo lo anterior",
      "Destacar ofertas en marketplace",
      "Ver estadísticas de perfil",
      "Badge de miembro activo",
    ],
    icon: Trophy,
    color: "text-green-500",
  },
  {
    level: 4,
    name: "Líder",
    minPoints: 1000,
    benefits: [
      "Todo lo anterior",
      "Ser mentor de nuevos miembros",
      "Organizar eventos de capítulo",
      "Prioridad en el matching",
    ],
    icon: Crown,
    color: "text-purple-500",
  },
  {
    level: 5,
    name: "Embajador",
    minPoints: 2500,
    benefits: [
      "Todo lo anterior",
      "Perfil verificado premium",
      "Acceso a eventos exclusivos",
      "Programa de referidos mejorado (150 puntos por referido)",
    ],
    icon: Gift,
    color: "text-orange-500",
  },
];

export function LevelBenefitsCard({ currentLevel, currentPoints }: LevelBenefitsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Beneficios por Nivel
        </CardTitle>
        <CardDescription>
          Gana puntos participando en la comunidad para desbloquear beneficios exclusivos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {levelBenefits.map((levelInfo) => {
          const isUnlocked = currentPoints >= levelInfo.minPoints;
          const isCurrent = levelInfo.level === currentLevel;
          const Icon = levelInfo.icon;

          return (
            <div
              key={levelInfo.level}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                isCurrent && "border-primary bg-primary/5",
                !isUnlocked && "opacity-50"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-full",
                      isUnlocked ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    {isUnlocked ? (
                      <Icon className={cn("h-5 w-5", levelInfo.color)} />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      Nivel {levelInfo.level}: {levelInfo.name}
                      {isCurrent && <Badge variant="default">Tu nivel actual</Badge>}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {isUnlocked ? (
                        <>✅ Desbloqueado ({levelInfo.minPoints} puntos)</>
                      ) : (
                        <>
                          🔒 Requiere {levelInfo.minPoints} puntos 
                          (Te faltan {levelInfo.minPoints - currentPoints})
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <ul className="space-y-2 text-sm">
                {levelInfo.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className={cn("mt-0.5", isUnlocked ? "text-green-500" : "text-muted-foreground")}>
                      {isUnlocked ? "✓" : "○"}
                    </span>
                    <span className={cn(!isUnlocked && "text-muted-foreground")}>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <div className="bg-muted/50 p-4 rounded-lg border border-border">
          <p className="text-sm font-medium mb-2">💡 Cómo ganar puntos:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Completar tu perfil: 50 puntos</li>
            <li>• Publicar en el feed: 10 puntos</li>
            <li>• Recibir likes: 2 puntos c/u</li>
            <li>• Completar reuniones 1-1: 20 puntos</li>
            <li>• Referir nuevos miembros: 100 puntos</li>
            <li>• Publicar ofertas: 15 puntos</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
