import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Send, Filter, Flag, Trophy, Medal, TrendingUp } from "lucide-react";
import { ReportUserDialog } from "@/components/ReportUserDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { PointsLevelBadge } from "@/components/PointsLevelBadge";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const POST_CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "caso_exito", label: "🏆 Caso de Éxito" },
  { value: "busco_cliente", label: "🔍 Busco Cliente" },
  { value: "oportunidad", label: "💡 Oportunidad" },
  { value: "consejo", label: "📌 Consejo" },
  { value: "general", label: "💬 General" },
];

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  professional_id: string;
  professionals: {
    full_name: string;
    photo_url: string | null;
    business_name: string | null;
  };
  post_likes: { id: string; professional_id: string }[];
  post_comments: {
    id: string;
    content: string;
    created_at: string;
    professionals: {
      full_name: string;
      photo_url: string | null;
    };
  }[];
}

interface RankedProfessional {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  company_name: string | null;
  total_points: number;
  profession_specializations: { name: string } | null;
  specializations: { name: string } | null;
  sector_catalog: { name: string } | null;
}

interface BadgeData {
  id: string;
  icon: string;
  name: string;
  description: string;
  category: string;
}

const SomosUnicos = () => {
  const { user } = useAuth();

  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("general");
  const [filterCategory, setFilterCategory] = useState("all");
  const [commentContent, setCommentContent] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [currentProfessional, setCurrentProfessional] = useState<any>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string; postId?: string } | null>(null);

  // Rankings state
  const [rankedProfessionals, setRankedProfessionals] = useState<RankedProfessional[]>([]);
  const [myProfessionalId, setMyProfessionalId] = useState<string | null>(null);
  const [profBadges, setProfBadges] = useState<Record<string, BadgeData[]>>({});
  const [loadingRankings, setLoadingRankings] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCurrentProfessional();
      fetchPosts();
      loadRankings();
    }
  }, [user]);

  // ── Feed logic ──
  const fetchCurrentProfessional = async () => {
    const { data } = await supabase
      .from("professionals")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    setCurrentProfessional(data);
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        professionals (full_name, photo_url, business_name),
        post_likes (id, professional_id),
        post_comments (
          id, content, created_at,
          professionals (full_name, photo_url)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar publicaciones");
      return;
    }
    setPosts(data || []);
  };

  const createPost = async () => {
    if (!newPostContent.trim() || !currentProfessional) return;
    setLoadingPost(true);
    const { error } = await supabase.from("posts").insert({
      content: `[${newPostCategory}] ${newPostContent}`,
      professional_id: currentProfessional.id,
    });
    if (error) {
      toast.error("Error al crear publicación");
    } else {
      toast.success("Publicación creada");
      setNewPostContent("");
      setNewPostCategory("general");
      fetchPosts();
    }
    setLoadingPost(false);
  };

  const toggleLike = async (postId: string) => {
    if (!currentProfessional) return;
    const post = posts.find((p) => p.id === postId);
    const hasLikedPost = post?.post_likes.some(
      (like) => like.professional_id === currentProfessional.id
    );
    if (hasLikedPost) {
      const like = post?.post_likes.find((l) => l.professional_id === currentProfessional.id);
      await supabase.from("post_likes").delete().eq("id", like?.id);
    } else {
      await supabase.from("post_likes").insert({
        post_id: postId,
        professional_id: currentProfessional.id,
      });
    }
    fetchPosts();
  };

  const addComment = async (postId: string) => {
    if (!commentContent[postId]?.trim() || !currentProfessional) return;
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      content: commentContent[postId],
      professional_id: currentProfessional.id,
    });
    if (error) {
      toast.error("Error al comentar");
    } else {
      setCommentContent({ ...commentContent, [postId]: "" });
      fetchPosts();
    }
  };

  const hasLiked = (post: Post) =>
    post.post_likes.some((like) => like.professional_id === currentProfessional?.id);

  const getCategoryFromContent = (content: string) => {
    const match = content.match(/^\[(\w+)\]/);
    return match ? match[1] : "general";
  };
  const getCleanContent = (content: string) => content.replace(/^\[\w+\]\s*/, "");
  const getCategoryBadge = (category: string) => {
    const cat = POST_CATEGORIES.find((c) => c.value === category);
    return cat ? cat.label : "💬 General";
  };

  const filteredPosts =
    filterCategory === "all"
      ? posts
      : posts.filter((p) => getCategoryFromContent(p.content) === filterCategory);

  // ── Rankings logic ──
  const loadRankings = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: myProf } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", authUser.id)
          .eq("status", "approved")
          .maybeSingle();
        if (myProf) setMyProfessionalId(myProf.id);
      }

      // @ts-expect-error - Complex nested select
      const { data: profsData } = await supabase
        .from("professionals_public")
        .select(`
          id, full_name, photo_url, position, company_name, total_points,
          profession_specializations (name),
          specializations (name),
          sector_catalog (name)
        `)
        .order("total_points", { ascending: false })
        .limit(20);

      if (profsData) setRankedProfessionals(profsData as any);

      const { data: allProfBadges } = await supabase
        .from("professional_badges")
        .select("professional_id, badges(id, icon, name, description, category)");

      if (allProfBadges) {
        const grouped: Record<string, BadgeData[]> = {};
        for (const pb of allProfBadges as any[]) {
          if (!grouped[pb.professional_id]) grouped[pb.professional_id] = [];
          if (pb.badges) grouped[pb.professional_id].push(pb.badges);
        }
        setProfBadges(grouped);
      }
    } catch (error) {
      console.error("Error loading rankings:", error);
    } finally {
      setLoadingRankings(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return null;
    }
  };

  const myRank = rankedProfessionals.findIndex((p) => p.id === myProfessionalId) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Somos Únicos</h1>
        <p className="text-muted-foreground">
          Comparte, inspira y descubre quiénes destacan en la comunidad
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Feed principal ── */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Crear post */}
          {currentProfessional?.status === "approved" && (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={currentProfessional?.photo_url || ""} />
                    <AvatarFallback>{currentProfessional?.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Select value={newPostCategory} onValueChange={setNewPostCategory}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POST_CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="¿Qué quieres compartir con la comunidad?"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={createPost} disabled={loadingPost || !newPostContent.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Publicar
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Filtro */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POST_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay publicaciones en esta categoría. ¡Sé el primero!
                </CardContent>
              </Card>
            ) : (
              filteredPosts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarImage src={post.professionals.photo_url || ""} />
                        <AvatarFallback>{post.professionals.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{post.professionals.full_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryBadge(getCategoryFromContent(post.content))}
                          </Badge>
                        </div>
                        {post.professionals.business_name && (
                          <div className="text-sm text-muted-foreground">{post.professionals.business_name}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="whitespace-pre-wrap">{getCleanContent(post.content)}</p>
                    {post.image_url && (
                      <img src={post.image_url} alt="Post image" className="rounded-lg w-full" />
                    )}
                    <div className="flex items-center gap-4 pt-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleLike(post.id)} className="gap-2">
                        <Heart className={`h-4 w-4 ${hasLiked(post) ? "fill-red-500 text-red-500" : ""}`} />
                        {post.post_likes.length}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowComments({ ...showComments, [post.id]: !showComments[post.id] })}
                        className="gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {post.post_comments.length}
                      </Button>
                      {currentProfessional && post.professional_id !== currentProfessional.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-muted-foreground"
                          onClick={() =>
                            setReportTarget({ id: post.professional_id, name: post.professionals.full_name, postId: post.id })
                          }
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {showComments[post.id] && (
                      <div className="space-y-4 pt-4 border-t">
                        {post.post_comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={comment.professionals.photo_url || ""} />
                              <AvatarFallback>{comment.professionals.full_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="bg-muted rounded-lg p-3">
                                <div className="font-semibold text-sm">{comment.professionals.full_name}</div>
                                <p className="text-sm">{comment.content}</p>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 ml-3">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                              </div>
                            </div>
                          </div>
                        ))}
                        {currentProfessional?.status === "approved" && (
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={currentProfessional?.photo_url || ""} />
                              <AvatarFallback>{currentProfessional?.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 flex gap-2">
                              <Textarea
                                placeholder="Escribe un comentario..."
                                value={commentContent[post.id] || ""}
                                onChange={(e) =>
                                  setCommentContent({ ...commentContent, [post.id]: e.target.value })
                                }
                                rows={2}
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={() => addComment(post.id)}
                                disabled={!commentContent[post.id]?.trim()}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* ── Ranking lateral ── */}
        <div className="lg:w-80 xl:w-96 space-y-4 flex-shrink-0">
          {/* Mi posición */}
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
                      points={rankedProfessionals.find((p) => p.id === myProfessionalId)?.total_points || 0}
                      size="sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top ranking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Ranking
              </CardTitle>
              <CardDescription>Los que más aportan a la comunidad</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRankings ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {rankedProfessionals.map((prof, index) => {
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
                            {prof.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
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

          {/* Stats rápidas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comunidad</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold">{rankedProfessionals.length}</p>
                <p className="text-xs text-muted-foreground">Miembros</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {rankedProfessionals.reduce((sum, p) => sum + p.total_points, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Puntos totales</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {currentProfessional && reportTarget && (
        <ReportUserDialog
          open={!!reportTarget}
          onOpenChange={(open) => !open && setReportTarget(null)}
          reportedId={reportTarget.id}
          reportedName={reportTarget.name}
          context="feed_post"
          contextId={reportTarget.postId}
          reporterId={currentProfessional.id}
        />
      )}
    </div>
  );
};

export default SomosUnicos;
