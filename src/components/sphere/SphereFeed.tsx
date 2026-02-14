import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  professional: {
    id: string;
    full_name: string;
    photo_url: string | null;
    business_name: string | null;
  };
  likes: number;
  comments: number;
  hasLiked: boolean;
}

interface SphereFeedProps {
  sphereId: number;
}

export const SphereFeed = ({ sphereId }: SphereFeedProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [currentProfessionalId, setCurrentProfessionalId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentProfessional();
    loadPosts();
  }, [sphereId]);

  const loadCurrentProfessional = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setCurrentProfessionalId(data.id);
    }
  };

  const loadPosts = async () => {
    try {
      // Get professionals from this sphere
      const { data: sphereProfessionals } = await supabase
        .from("professionals")
        .select("id")
        .eq("business_sphere_id", sphereId)
        .eq("status", "approved");

      if (!sphereProfessionals || sphereProfessionals.length === 0) {
        setLoading(false);
        return;
      }

      const professionalIds = sphereProfessionals.map(p => p.id);

      // Get posts from these professionals
      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          image_url,
          created_at,
          professionals!inner (
            id,
            full_name,
            photo_url,
            business_name
          )
        `)
        .in("professional_id", professionalIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!postsData) {
        setLoading(false);
        return;
      }

      // Get likes and comments count
      const postsWithStats = await Promise.all(
        postsData.map(async (post) => {
          const [likesResult, commentsResult, userLike] = await Promise.all([
            supabase
              .from("post_likes")
              .select("id", { count: "exact", head: true })
              .eq("post_id", post.id),
            supabase
              .from("post_comments")
              .select("id", { count: "exact", head: true })
              .eq("post_id", post.id),
            currentProfessionalId
              ? supabase
                  .from("post_likes")
                  .select("id")
                  .eq("post_id", post.id)
                  .eq("professional_id", currentProfessionalId)
                  .maybeSingle()
              : Promise.resolve({ data: null })
          ]);

          return {
            id: post.id,
            content: post.content,
            image_url: post.image_url,
            created_at: post.created_at,
            professional: post.professionals,
            likes: likesResult.count || 0,
            comments: commentsResult.count || 0,
            hasLiked: !!userLike.data
          };
        })
      );

      setPosts(postsWithStats);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !currentProfessionalId) return;

    try {
      const { error } = await supabase
        .from("posts")
        .insert({
          professional_id: currentProfessionalId,
          content: newPost.trim()
        });

      if (error) throw error;

      toast({
        title: "Post publicado",
        description: "Tu publicación está ahora visible en tu esfera"
      });

      setNewPost("");
      loadPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "No se pudo publicar el post",
        variant: "destructive"
      });
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentProfessionalId) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.hasLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("professional_id", currentProfessionalId);
      } else {
        await supabase
          .from("post_likes")
          .insert({
            post_id: postId,
            professional_id: currentProfessionalId
          });
      }

      loadPosts();
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create post */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Textarea
              placeholder="Comparte algo con tu esfera..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleCreatePost}
                disabled={!newPost.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Publicar en mi Grupo Profesional
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No hay publicaciones en tu esfera todavía. ¡Sé el primero en compartir algo!
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={post.professional.photo_url || ""} />
                    <AvatarFallback>
                      {post.professional.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{post.professional.full_name}</h4>
                      <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                        🌐 Mi Grupo Profesional
                      </span>
                    </div>
                    {post.professional.business_name && (
                      <p className="text-sm text-muted-foreground">
                        {post.professional.business_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: es
                      })}
                    </p>
                  </div>
                </div>

                <p className="whitespace-pre-wrap">{post.content}</p>

                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="rounded-lg max-h-96 object-cover w-full"
                  />
                )}

                <div className="flex items-center gap-4 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className={post.hasLiked ? "text-red-500" : ""}
                  >
                    <Heart
                      className={`h-4 w-4 mr-1 ${post.hasLiked ? "fill-current" : ""}`}
                    />
                    {post.likes}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {post.comments}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
