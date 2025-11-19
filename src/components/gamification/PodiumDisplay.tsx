import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Sparkles } from "lucide-react";
import { PointsLevelBadge } from "@/components/PointsLevelBadge";

interface Professional {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  company_name: string | null;
  total_points: number;
  sector_catalog?: {
    name: string;
  } | null;
  specializations?: {
    name: string;
  } | null;
  profession_specializations?: {
    name: string;
  } | null;
}

interface PodiumDisplayProps {
  topThree: Professional[];
  myProfessionalId?: string | null;
}

export const PodiumDisplay = ({ topThree, myProfessionalId }: PodiumDisplayProps) => {
  if (topThree.length === 0) return null;

  const [first, second, third] = topThree;

  const PodiumCard = ({ 
    professional, 
    rank, 
    heightClass 
  }: { 
    professional: Professional; 
    rank: number; 
    heightClass: string;
  }) => {
    const isMe = professional.id === myProfessionalId;
    const colors = {
      1: { bg: "from-yellow-400/20 to-yellow-600/20", border: "border-yellow-500", icon: "text-yellow-500", glow: "shadow-yellow-500/50" },
      2: { bg: "from-gray-300/20 to-gray-500/20", border: "border-gray-400", icon: "text-gray-400", glow: "shadow-gray-400/50" },
      3: { bg: "from-amber-400/20 to-amber-700/20", border: "border-amber-600", icon: "text-amber-600", glow: "shadow-amber-600/50" },
    };

    const color = colors[rank as keyof typeof colors];
    const Icon = rank === 1 ? Trophy : Medal;

    return (
      <div className={`${heightClass} flex flex-col items-center justify-end animate-scale-in`}>
        <div 
          className={`
            relative w-full max-w-[200px] bg-gradient-to-br ${color.bg} 
            rounded-t-xl border-2 ${color.border} p-4 
            flex flex-col items-center gap-3
            hover-scale transition-all duration-300
            ${rank === 1 ? `${color.glow} shadow-2xl` : 'shadow-lg'}
          `}
        >
          {/* Sparkles for first place */}
          {rank === 1 && (
            <>
              <Sparkles className="absolute -top-2 -left-2 w-6 h-6 text-yellow-500 animate-pulse" />
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </>
          )}
          
          {/* Avatar with rank badge */}
          <div className="relative">
            <Avatar className={`${rank === 1 ? 'h-24 w-24' : 'h-20 w-20'} border-4 ${color.border}`}>
              <AvatarImage src={professional.photo_url || undefined} />
              <AvatarFallback className="text-lg font-bold">
                {professional.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${color.bg} border-2 ${color.border} rounded-full p-2`}>
              <Icon className={`${rank === 1 ? 'w-6 h-6' : 'w-5 h-5'} ${color.icon}`} />
            </div>
          </div>

          {/* Name and badges */}
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-1 mb-1">
              <h3 className={`font-bold truncate ${rank === 1 ? 'text-lg' : 'text-base'}`}>
                {professional.full_name}
              </h3>
              {isMe && <Badge variant="outline" className="text-xs ml-1">Tú</Badge>}
            </div>
            
            {professional.position && (
              <p className="text-xs text-muted-foreground truncate mb-1">
                {professional.position}
              </p>
            )}
            
            {professional.company_name && (
              <p className="text-xs text-muted-foreground truncate mb-2">
                {professional.company_name}
              </p>
            )}

            {professional.profession_specializations ? (
              <Badge variant="secondary" className="text-xs mb-2">
                {professional.profession_specializations.name}
              </Badge>
            ) : professional.specializations ? (
              <Badge variant="secondary" className="text-xs mb-2">
                {professional.specializations.name}
              </Badge>
            ) : professional.sector_catalog ? (
              <Badge variant="secondary" className="text-xs mb-2">
                {professional.sector_catalog.name}
              </Badge>
            ) : null}
          </div>

          {/* Points */}
          <div className="text-center">
            <p className={`font-bold ${color.icon} ${rank === 1 ? 'text-3xl' : 'text-2xl'}`}>
              {professional.total_points}
            </p>
            <p className="text-xs text-muted-foreground">puntos</p>
          </div>

          {/* Level badge */}
          <PointsLevelBadge points={professional.total_points} size="sm" />
        </div>

        {/* Podium base */}
        <div className={`w-full max-w-[200px] bg-gradient-to-b ${color.bg} border-2 border-t-0 ${color.border} rounded-b-lg p-2 text-center`}>
          <p className={`text-2xl font-bold ${color.icon}`}>#{rank}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[700px] flex items-end justify-center gap-4 p-8">
        {/* Second place */}
        {second && (
          <PodiumCard professional={second} rank={2} heightClass="h-[420px]" />
        )}
        
        {/* First place */}
        {first && (
          <PodiumCard professional={first} rank={1} heightClass="h-[480px]" />
        )}
        
        {/* Third place */}
        {third && (
          <PodiumCard professional={third} rank={3} heightClass="h-[380px]" />
        )}
      </div>
    </div>
  );
};
