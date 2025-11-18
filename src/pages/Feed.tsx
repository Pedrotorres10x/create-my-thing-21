import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { PremiumBanner } from "@/components/advertising/PremiumBanner";

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

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [commentContent, setCommentContent] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [currentProfessional, setCurrentProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCurrentProfessional();
      fetchPosts();
    }
  }, [user]);

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
          id,
          content,
          created_at,
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

    setLoading(true);
    const { error } = await supabase.from("posts").insert({
      content: newPostContent,
      professional_id: currentProfessional.id,
    });

    if (error) {
      toast.error("Error al crear publicación");
    } else {
      toast.success("Publicación creada");
      setNewPostContent("");
      fetchPosts();
    }
    setLoading(false);
  };

  const toggleLike = async (postId: string) => {
    if (!currentProfessional) return;

    const post = posts.find((p) => p.id === postId);
    const hasLiked = post?.post_likes.some(
      (like) => like.professional_id === currentProfessional.id
    );

    if (hasLiked) {
      const like = post?.post_likes.find(
        (l) => l.professional_id === currentProfessional.id
      );
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

  const hasLiked = (post: Post) => {
    return post.post_likes.some(
      (like) => like.professional_id === currentProfessional?.id
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Comunidad</h1>
        <p className="text-muted-foreground">
          Comparte logros, recursos y conecta con otros miembros
        </p>
      </div>

      {currentProfessional?.status === "approved" && (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarImage src={currentProfessional?.photo_url || ""} />
                <AvatarFallback>
                  {currentProfessional?.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <Textarea
                  placeholder="¿Qué quieres compartir con la comunidad?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={3}
                />
                <Button onClick={createPost} disabled={loading || !newPostContent.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Publicar
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Premium Banner */}
      <PremiumBanner location="feed" size="horizontal_large" />

      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay publicaciones aún. ¡Sé el primero en compartir algo!
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={post.professionals.photo_url || ""} />
                    <AvatarFallback>
                      {post.professionals.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold">
                      {post.professionals.full_name}
                    </div>
                    {post.professionals.business_name && (
                      <div className="text-sm text-muted-foreground">
                        {post.professionals.business_name}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap">{post.content}</p>

                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post image"
                    className="rounded-lg w-full"
                  />
                )}

                <div className="flex items-center gap-4 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(post.id)}
                    className="gap-2"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        hasLiked(post) ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                    {post.post_likes.length}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setShowComments({
                        ...showComments,
                        [post.id]: !showComments[post.id],
                      })
                    }
                    className="gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {post.post_comments.length}
                  </Button>
                </div>

                {showComments[post.id] && (
                  <div className="space-y-4 pt-4 border-t">
                    {post.post_comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.professionals.photo_url || ""} />
                          <AvatarFallback>
                            {comment.professionals.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-muted rounded-lg p-3">
                            <div className="font-semibold text-sm">
                              {comment.professionals.full_name}
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 ml-3">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </div>
                        </div>
                      </div>
                    ))}

                    {currentProfessional?.status === "approved" && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={currentProfessional?.photo_url || ""} />
                          <AvatarFallback>
                            {currentProfessional?.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2">
                          <Textarea
                            placeholder="Escribe un comentario..."
                            value={commentContent[post.id] || ""}
                            onChange={(e) =>
                              setCommentContent({
                                ...commentContent,
                                [post.id]: e.target.value,
                              })
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
  );
};

export default Feed;
