import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, MapPin, Handshake, TrendingUp, ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { PointsLevelBadge } from "@/components/PointsLevelBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ClosedDeal {
  id: string;
  description: string;
  completed_at: string;
  declared_profit: number | null;
  thanks_amount_selected: number | null;
  referrer: { id: string; full_name: string; photo_url: string | null; company_name: string | null };
  receiver: { id: string; full_name: string; photo_url: string | null; company_name: string | null };
}

interface RankedProfessional {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  company_name: string | null;
  total_points: number;
  city: string | null;
  state: string | null;
  chapter_id: string | null;
  deals_completed: number;
  profession_specializations: { name: string } | null;
  specializations: { name: string } | null;
  sector_catalog: { name: string } | null;
}

type RankingScope = "grupo" | "ciudad" | "provincia" | "nacional";

const SomosUnicos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Deals feed state
  const [closedDeals, setClosedDeals] = useState<ClosedDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);

  // Rankings state
  const [rankedProfessionals, setRankedProfessionals] = useState<RankedProfessional[]>([]);
  const [myProfessionalId, setMyProfessionalId] = useState<string | null>(null);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const [rankingScope, setRankingScope] = useState<RankingScope>("nacional");
  const [myGeoInfo, setMyGeoInfo] = useState<{ city: string | null; state: string | null; chapter_id: string | null }>({ city: null, state: null, chapter_id: null });

  useEffect(() => {
    if (user) {
      fetchClosedDeals();
      loadRankings();
    }
  }, [user]);

  const fetchClosedDeals = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("deals")
        .select(`
          id, description, completed_at, declared_profit, thanks_amount_selected,
          referrer:professionals!deals_referrer_id_fkey (id, full_name, photo_url, company_name),
          receiver:professionals!deals_receiver_id_fkey (id, full_name, photo_url, company_name)
        `)
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching closed deals:", error);
        return;
      }
      setClosedDeals(data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoadingDeals(false);
    }
  };

  // ── Rankings logic ──
  const loadRankings = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: myProf } = await supabase
          .from("professionals")
          .select("id, city, state, chapter_id")
          .eq("user_id", authUser.id)
          .maybeSingle();
        if (myProf) {
          setMyProfessionalId(myProf.id);
          setMyGeoInfo({ city: myProf.city, state: myProf.state, chapter_id: myProf.chapter_id });
        }
      }

      // @ts-ignore
      const { data: profsData } = await supabase
        .from("professionals_public")
        .select(`
          id, full_name, photo_url, position, company_name, total_points, deals_completed,
          city, state, chapter_id,
          profession_specializations (name),
          specializations (name),
          sector_catalog (name)
        `)
        .order("total_points", { ascending: false })
        .limit(100);

      if (profsData) setRankedProfessionals(profsData as any);
    } catch (error) {
      console.error("Error loading rankings:", error);
    } finally {
      setLoadingRankings(false);
    }
  };

  const filteredRankings = useMemo(() => {
    if (rankingScope === "nacional") return rankedProfessionals;
    return rankedProfessionals.filter((prof) => {
      switch (rankingScope) {
        case "grupo":
          return myGeoInfo.chapter_id && prof.chapter_id === myGeoInfo.chapter_id;
        case "ciudad":
          return myGeoInfo.city && prof.city === myGeoInfo.city;
        case "provincia":
          return myGeoInfo.state && prof.state === myGeoInfo.state;
        default:
          return true;
      }
    });
  }, [rankedProfessionals, rankingScope, myGeoInfo]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return null;
    }
  };

  const myRank = filteredRankings.findIndex((p) => p.id === myProfessionalId) + 1;

  // Community stats
  const totalDeals = rankedProfessionals.reduce((sum, p) => sum + (p.deals_completed || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Somos Únicos</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Tratos cerrados y ranking de la comunidad. Aquí se celebran las victorias reales.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Deals Feed ── */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* CTA to refer */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Handshake className="h-6 w-6 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">¿Tienes un cliente para alguien de tu tribu?</p>
                  <p className="text-xs text-muted-foreground">Refiere y cobra tu comisión cuando cierre el trato</p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate("/recomendacion")} className="flex-shrink-0">
                Referir
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Últimos tratos cerrados
          </h2>

          {loadingDeals ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : closedDeals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Handshake className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground font-medium">Aún no hay tratos cerrados</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sé el primero en referir un cliente y cerrar un trato
                </p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/recomendacion")}>
                  Referir un cliente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {closedDeals.map((deal) => (
                <Card key={deal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex -space-x-3 flex-shrink-0">
                        <Avatar className="h-10 w-10 border-2 border-background">
                          <AvatarImage src={deal.referrer?.photo_url || undefined} />
                          <AvatarFallback>
                            {deal.referrer?.full_name?.split(" ").map(n => n[0]).join("") || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <Avatar className="h-10 w-10 border-2 border-background">
                          <AvatarImage src={deal.receiver?.photo_url || undefined} />
                          <AvatarFallback>
                            {deal.receiver?.full_name?.split(" ").map(n => n[0]).join("") || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold">{deal.referrer?.full_name}</span>
                          {" "}refirió un cliente a{" "}
                          <span className="font-semibold">{deal.receiver?.full_name}</span>
                        </p>
                        {(deal.declared_profit != null && deal.declared_profit > 0) && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-lg font-black text-primary">
                              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(deal.declared_profit)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">en negocio generado</span>
                          </div>
                        )}
                        {deal.thanks_amount_selected != null && deal.thanks_amount_selected > 0 && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            💰 Agradecimiento: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(deal.thanks_amount_selected)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {deal.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="default" className="text-[10px]">
                            ✅ Trato cerrado
                          </Badge>
                          {deal.completed_at && (
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(deal.completed_at), { addSuffix: true, locale: es })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── Ranking lateral ── */}
        <div className="lg:w-80 xl:w-96 space-y-4 flex-shrink-0">
          {myRank > 0 && (
            <Card className="border-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Tu posición</p>
                    <p className="text-2xl font-bold">#{myRank}</p>
                  </div>
                  <div className="ml-auto">
                    <PointsLevelBadge
                      points={filteredRankings.find((p) => p.id === myProfessionalId)?.total_points || 0}
                      size="sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Ranking
              </CardTitle>
              <Tabs value={rankingScope} onValueChange={(v) => setRankingScope(v as RankingScope)} className="mt-2">
                <TabsList className="grid grid-cols-4 w-full h-auto">
                  <TabsTrigger value="grupo" className="text-[11px] px-1 py-1.5">Mi Grupo</TabsTrigger>
                  <TabsTrigger value="ciudad" className="text-[11px] px-1 py-1.5">Ciudad</TabsTrigger>
                  <TabsTrigger value="provincia" className="text-[11px] px-1 py-1.5">Provincia</TabsTrigger>
                  <TabsTrigger value="nacional" className="text-[11px] px-1 py-1.5">Nacional</TabsTrigger>
                </TabsList>
              </Tabs>
              {rankingScope !== "nacional" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {rankingScope === "grupo" && (myGeoInfo.city || "Sin grupo asignado")}
                  {rankingScope === "ciudad" && (myGeoInfo.city || "Sin ciudad")}
                  {rankingScope === "provincia" && (myGeoInfo.state || "Sin provincia")}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {loadingRankings ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredRankings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Sin datos para este ámbito</p>
                  <p className="text-xs mt-1">
                    {rankingScope === "grupo" ? "Únete a un grupo para ver el ranking local" :
                     "Completa tu perfil con tu ubicación"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRankings.slice(0, 20).map((prof, index) => {
                    const rank = index + 1;
                    return (
                      <div
                        key={prof.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                          prof.id === myProfessionalId ? "border-primary bg-primary/5" : "bg-card"
                        }`}
                      >
                        <div className="w-8 text-center font-bold text-sm">
                          {rank <= 3 ? getRankIcon(rank) : `#${rank}`}
                        </div>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={prof.photo_url || undefined} />
                          <AvatarFallback>
                            {prof.full_name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="font-medium text-sm truncate">{prof.full_name}</h4>
                            {prof.id === myProfessionalId && (
                              <Badge variant="outline" className="text-[10px] px-1">Tú</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {prof.profession_specializations?.name ||
                              prof.specializations?.name ||
                              prof.sector_catalog?.name ||
                              ""}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold">{prof.total_points}</p>
                          <p className="text-[10px] text-muted-foreground">pts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comunidad</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xl font-bold">{filteredRankings.length}</p>
                <p className="text-xs text-muted-foreground">Miembros</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDeals}</p>
                <p className="text-xs text-muted-foreground">Tratos</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {filteredRankings.reduce((sum, p) => sum + p.total_points, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Puntos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SomosUnicos;
