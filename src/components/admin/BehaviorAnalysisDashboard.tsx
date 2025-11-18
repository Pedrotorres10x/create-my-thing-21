import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  score: number;
}

interface BehaviorRiskScore {
  id: string;
  professional_id: string;
  overall_risk_score: number;
  risk_factors: RiskFactor[];
  last_updated: string;
  alert_threshold_reached: boolean;
  professionals: {
    id: string;
    full_name: string;
    email: string;
    photo_url: string | null;
  };
}

export function BehaviorAnalysisDashboard() {
  const [riskScores, setRiskScores] = useState<BehaviorRiskScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskScores();
  }, []);

  const fetchRiskScores = async () => {
    try {
      const { data, error } = await supabase
        .from('behavioral_risk_scores')
        .select(`
          *,
          professionals!behavioral_risk_scores_professional_id_fkey (
            id,
            full_name,
            email,
            photo_url
          )
        `)
        .order('overall_risk_score', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRiskScores((data || []).map(item => ({
        ...item,
        risk_factors: Array.isArray(item.risk_factors) 
          ? (item.risk_factors as unknown as RiskFactor[]) 
          : [],
      })) as BehaviorRiskScore[]);
    } catch (error) {
      console.error('Error fetching risk scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Crítico</Badge>;
    } else if (score >= 60) {
      return <Badge variant="destructive" className="gap-1"><TrendingUp className="h-3 w-3" />Alto</Badge>;
    } else if (score >= 40) {
      return <Badge variant="default" className="gap-1">Medio</Badge>;
    }
    return <Badge variant="secondary" className="gap-1">Bajo</Badge>;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (riskScores.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay análisis de comportamiento disponibles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Usuarios en riesgo alto</CardDescription>
            <CardTitle className="text-3xl">
              {riskScores.filter(r => r.overall_risk_score >= 60).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Score promedio</CardDescription>
            <CardTitle className="text-3xl">
              {Math.round(riskScores.reduce((acc, r) => acc + r.overall_risk_score, 0) / riskScores.length)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Alertas activas</CardDescription>
            <CardTitle className="text-3xl">
              {riskScores.filter(r => r.alert_threshold_reached).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {riskScores.map((risk) => (
        <Card key={risk.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>
                    {risk.professionals.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">
                    {risk.professionals.full_name}
                  </CardTitle>
                  <CardDescription>{risk.professionals.email}</CardDescription>
                </div>
              </div>
              {getRiskBadge(risk.overall_risk_score)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Score de Riesgo</p>
                <p className="text-2xl font-bold">{risk.overall_risk_score}/100</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" />
                  Actualizado {format(new Date(risk.last_updated), "PPp", { locale: es })}
                </p>
              </div>
            </div>

            {risk.risk_factors && risk.risk_factors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">Factores de riesgo detectados:</p>
                <div className="space-y-2">
                  {risk.risk_factors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${getSeverityColor(factor.severity)}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{factor.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Severidad: {factor.severity === 'high' ? 'Alta' : factor.severity === 'medium' ? 'Media' : 'Baja'} 
                          {' · '}Score: +{factor.score}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
