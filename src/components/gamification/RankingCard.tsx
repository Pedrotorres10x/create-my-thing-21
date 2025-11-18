import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RankingCardProps {
  ranking: number;
  totalPoints: number;
  level: {
    name: string;
    color: string;
  };
}

export const RankingCard = ({ ranking, totalPoints, level }: RankingCardProps) => {
  const getRankIcon = () => {
    if (ranking === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (ranking === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (ranking === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <Award className="w-6 h-6 text-primary" />;
  };

  const getRankBadgeVariant = () => {
    if (ranking <= 3) return "default";
    if (ranking <= 10) return "secondary";
    return "outline";
  };

  return (
    <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all hover-scale">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      
      <CardHeader className="relative pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Tu Ranking
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getRankIcon()}
            <div>
              <p className="text-sm text-muted-foreground">Posición</p>
              <p className="text-3xl font-bold">#{ranking}</p>
            </div>
          </div>
          
          <Badge 
            variant={getRankBadgeVariant()}
            className="text-lg py-2 px-4"
          >
            {totalPoints} pts
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
          <div 
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: level.color }}
          />
          <span className="font-semibold text-primary">
            Nivel {level.name}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
