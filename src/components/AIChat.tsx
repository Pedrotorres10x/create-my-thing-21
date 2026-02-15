import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User, Sparkles, Bot, Lock, Camera, Loader2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import aliciaAvatar from "@/assets/alicia-avatar.png";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { AIUsageIndicator } from "./subscription/AIUsageIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIChat() {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const { canSendAIMessage, incrementAIMessages } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conector-chat`;
  const isStreamingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Scroll inteligente: solo si el usuario está cerca del final
  const scrollToBottomIfNeeded = (force = false) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    
    if (force || isNearBottom || isStreamingRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  // Solo scroll automático en mensajes completos nuevos
  useEffect(() => {
    if (!isStreamingRef.current && messages.length > 0) {
      scrollToBottomIfNeeded(true);
    }
  }, [messages.length]);

  // Helper to validate token is authenticated (not anon key)
  const isAuthenticatedToken = (token: string): boolean => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const header = JSON.parse(atob(parts[0]));
      if (!header.kid) return false;
      const payload = JSON.parse(atob(parts[1]));
      return payload.role === 'authenticated' && !!payload.sub;
    } catch {
      return false;
    }
  };

  // Generar mensaje inicial proactivo de Alicia cuando el usuario entra
  useEffect(() => {
    if (authLoading || !user) return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const startChat = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) return;
      
      const validatedToken = currentSession.access_token;
      if (!isAuthenticatedToken(validatedToken)) return;

      try {
        const { data: professional } = await supabase
          .from('professionals')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!professional) {
          setInitializing(false);
          return;
        }

        const isOnboarding = sessionStorage.getItem('conector-onboarding') === 'true';
        if (isOnboarding) {
          sessionStorage.removeItem('conector-onboarding');
          sessionStorage.setItem('alicia-greeting-shown', 'true');
        }
        
        isStreamingRef.current = true;

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${validatedToken}`,
          },
          body: JSON.stringify({ 
            messages: [{ role: "user", content: isOnboarding ? "[ONBOARDING]" : "[INICIO_SESION]" }],
            professionalId: professional.id
          }),
        });

        if (!resp.ok) {
          if (resp.status === 401) {
            console.log('Got 401, will retry when session updates');
          } else {
            console.error('Chat init failed:', resp.status);
          }
          isStreamingRef.current = false;
          hasInitializedRef.current = false; // Allow retry
          setInitializing(false);
          return;
        }

        if (!resp.body) {
          isStreamingRef.current = false;
          setInitializing(false);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let assistantContent = "";
        let pendingDataLines: string[] = [];

        const processJsonStr = (jsonStr: string) => {
          if (jsonStr === "[DONE]") return;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages([{ role: "assistant", content: assistantContent }]);
            }
          } catch {
            // Accumulate partial JSON across lines
            pendingDataLines.push(jsonStr);
            // Try to parse accumulated lines as one JSON object
            const combined = pendingDataLines.join("");
            try {
              const parsed = JSON.parse(combined);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantContent += content;
                setMessages([{ role: "assistant", content: assistantContent }]);
              }
              pendingDataLines = [];
            } catch {
              // Still incomplete, wait for more lines
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            
            // If we have pending partial JSON, any non-empty line continues it
            if (pendingDataLines.length > 0) {
              if (line.trim() === "") {
                // Empty line = end of SSE event, reset pending
                pendingDataLines = [];
                continue;
              }
              // This line is a continuation of the fragmented JSON
              const fragment = line.startsWith("data: ") ? line.slice(6) : line;
              processJsonStr(fragment);
              continue;
            }
            
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            processJsonStr(jsonStr);
          }
        }

        isStreamingRef.current = false;
        setInitializing(false);
        scrollToBottomIfNeeded(true);
      } catch (error: any) {
        console.error("Error initializing chat:", error);
        isStreamingRef.current = false;
        hasInitializedRef.current = false; // Allow retry
        setInitializing(false);
      }
    };

    startChat();
  }, [authLoading, user?.id, CHAT_URL]);


  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Validate session before proceeding
    if (!session?.access_token || !isAuthenticatedToken(session.access_token)) {
      toast.error("Sesión no válida", {
        description: "Por favor, vuelve a iniciar sesión.",
      });
      return;
    }

    const accessToken = session.access_token;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    isStreamingRef.current = true;

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      // Get professional ID
      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          professionalId: professional?.id
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Error al conectar con el asistente");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let pendingDataLines: string[] = [];

      const processJsonStr2 = (jsonStr: string): boolean => {
        if (jsonStr === "[DONE]") return true;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) updateAssistant(content);
          return false;
        } catch {
          pendingDataLines.push(jsonStr);
          const combined = pendingDataLines.join("");
          try {
            const parsed = JSON.parse(combined);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
            pendingDataLines = [];
          } catch {
            // Still incomplete
          }
          return false;
        }
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          
          if (pendingDataLines.length > 0) {
            if (line.trim() === "") {
              pendingDataLines = [];
              continue;
            }
            const fragment = line.startsWith("data: ") ? line.slice(6) : line;
            if (processJsonStr2(fragment)) { streamDone = true; break; }
            continue;
          }
          
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (processJsonStr2(jsonStr)) { streamDone = true; break; }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;

          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {}
        }
      }

      // Increment AI message count after successful response
      await incrementAIMessages();
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Lo siento, hubo un problema al procesar tu mensaje. Por favor intenta de nuevo." },
      ]);
    } finally {
      setIsLoading(false);
      isStreamingRef.current = false;
      scrollToBottomIfNeeded(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleChatPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Update professionals table
      await supabase
        .from("professionals")
        .update({ photo_url: urlWithCacheBust })
        .eq("user_id", user.id);

      toast.success("¡Foto subida! ✅");

      // Send confirmation message to Alic.IA
      const confirmMsg: Message = { role: "user", content: "[FOTO_SUBIDA]" };
      setMessages((prev) => [...prev, { role: "user", content: "📸 Foto subida ✅" }]);
      
      // Trigger AI response acknowledging the photo
      setIsLoading(true);
      isStreamingRef.current = true;

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) return;

      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let assistantContent = "";
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, confirmMsg],
          professionalId: professional?.id
        }),
      });

      if (resp.ok && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let pendingDataLines: string[] = [];

        const processChunk = (jsonStr: string) => {
          if (jsonStr === "[DONE]") return;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            pendingDataLines.push(jsonStr);
            const combined = pendingDataLines.join("");
            try {
              const parsed = JSON.parse(combined);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantContent += content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                  }
                  return [...prev, { role: "assistant", content: assistantContent }];
                });
              }
              pendingDataLines = [];
            } catch { /* wait */ }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (pendingDataLines.length > 0) {
              if (line.trim() === "") { pendingDataLines = []; continue; }
              const fragment = line.startsWith("data: ") ? line.slice(6) : line;
              processChunk(fragment);
              continue;
            }
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            processChunk(line.slice(6).trim());
          }
        }
      }

      setIsLoading(false);
      isStreamingRef.current = false;
      scrollToBottomIfNeeded(true);
    } catch (error: any) {
      console.error("Photo upload error:", error);
      toast.error("No se pudo subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChatLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("El logo no debe superar 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      await supabase
        .from("professionals")
        .update({ logo_url: urlWithCacheBust })
        .eq("user_id", user.id);

      toast.success("¡Logo subido! ✅");

      const confirmMsg: Message = { role: "user", content: "[LOGO_SUBIDO]" };
      setMessages((prev) => [...prev, { role: "user", content: "🏢 Logo subido ✅" }]);

      setIsLoading(true);
      isStreamingRef.current = true;

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) return;

      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let assistantContent = "";
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, confirmMsg],
          professionalId: professional?.id
        }),
      });

      if (resp.ok && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let pendingDataLines: string[] = [];

        const processChunk = (jsonStr: string) => {
          if (jsonStr === "[DONE]") return;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            pendingDataLines.push(jsonStr);
            const combined = pendingDataLines.join("");
            try {
              const parsed = JSON.parse(combined);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantContent += content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                  }
                  return [...prev, { role: "assistant", content: assistantContent }];
                });
              }
              pendingDataLines = [];
            } catch { /* wait */ }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (pendingDataLines.length > 0) {
              if (line.trim() === "") { pendingDataLines = []; continue; }
              const fragment = line.startsWith("data: ") ? line.slice(6) : line;
              processChunk(fragment);
              continue;
            }
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            processChunk(line.slice(6).trim());
          }
        }
      }

      setIsLoading(false);
      isStreamingRef.current = false;
      scrollToBottomIfNeeded(true);
    } catch (error: any) {
      console.error("Logo upload error:", error);
      toast.error("No se pudo subir el logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <Card className="w-full flex flex-col shadow-2xl border-none overflow-hidden bg-gradient-to-br from-background via-background to-primary/10 relative">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 alicia-gradient rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/30 rounded-full blur-2xl animate-float" />
      </div>

      {/* Cabecera vibrante con Alicia como protagonista */}
      <div className="relative z-10 border-b border-primary/20 p-4 md:p-5 alicia-gradient">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative animate-float">
              <Avatar className="h-12 w-12 md:h-14 md:w-14 border-3 border-white/30 shadow-2xl alicia-shadow ring-2 ring-white/20">
                <AvatarImage src={aliciaAvatar} alt="Alic.ia" className="object-cover" />
                <AvatarFallback className="bg-white/90 text-primary text-lg md:text-xl font-bold">
                  <Bot className="h-6 w-6 md:h-7 md:w-7" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-1 -right-1 bg-white text-primary rounded-full p-1 animate-bounce">
                <Sparkles className="h-3 w-3" />
              </div>
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                Alic.ia
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                  IA
                </Badge>
              </h3>
              <p className="text-xs md:text-sm text-white/90 font-medium">Trabajo para ti 24/7</p>
            </div>
          </div>
          <AIUsageIndicator />
        </div>
      </div>

      {/* Área de mensajes con diseño mejorado */}
      <div ref={scrollContainerRef} className="relative z-10 h-[400px] overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-primary/5">
        {initializing ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4 bg-primary/10" />
            <Skeleton className="h-4 w-1/2 bg-secondary/10" />
            <Skeleton className="h-4 w-2/3 bg-accent/10" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3">
              <div className="mx-auto w-16 h-16 alicia-gradient rounded-full flex items-center justify-center animate-pulse-glow">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <p className="text-foreground text-base font-medium">
                ¡Hola! 👋 Soy Alic.ia
              </p>
              <p className="text-muted-foreground text-sm">
                ¿En qué puedo ayudarte hoy?
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-3 animate-fade-in",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-9 w-9 border-2 border-primary/30 shadow-lg alicia-shadow flex-shrink-0">
                  <AvatarImage src={aliciaAvatar} alt="Alic.ia" className="object-cover" />
                  <AvatarFallback className="alicia-gradient text-white text-sm font-bold animate-gradient">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-5 py-3.5",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-gradient-to-br from-card to-primary/5 border border-primary/20 text-foreground shadow-lg backdrop-blur-sm"
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ 
                  __html: message.content
                    .replace(/\[PERFIL:[^\]]*\]/g, '')
                    .replace(/\[CREAR_CONFLICTO:[^\]]*\]/g, '')
                    .replace(/\[PEDIR_FOTO\]/g, '')
                    .replace(/\[PEDIR_LOGO\]/g, '')
                    .replace(/\[IR_A_INVITADOS\]/g, '')
                    .replace(/\[IR_A_RECOMENDACION\]/g, '')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                }} />
                {message.role === "assistant" && message.content.includes("[IR_A_INVITADOS]") && (
                  <div className="mt-3">
                    <Button
                      onClick={() => navigate('/referrals')}
                      className="alicia-gradient hover:opacity-90 text-white rounded-xl gap-2"
                      size="sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      Ir a Mis Invitados
                    </Button>
                  </div>
                )}
                {message.role === "assistant" && message.content.includes("[IR_A_RECOMENDACION]") && (
                  <div className="mt-3">
                    <Button
                      onClick={() => navigate('/recomendacion')}
                      className="alicia-gradient hover:opacity-90 text-white rounded-xl gap-2"
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                      Ir a Recomendación
                    </Button>
                  </div>
                )}
                {message.role === "assistant" && message.content.includes("[PEDIR_FOTO]") && (
                  <div className="mt-3">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleChatPhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                    <Button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="alicia-gradient hover:opacity-90 text-white rounded-xl gap-2"
                      size="sm"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {uploadingPhoto ? "Subiendo..." : "📸 Subir mi foto"}
                    </Button>
                  </div>
                )}
                {message.role === "assistant" && message.content.includes("[PEDIR_LOGO]") && (
                  <div className="mt-3">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      onChange={handleChatLogoUpload}
                      className="hidden"
                      disabled={uploadingLogo}
                    />
                    <Button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="alicia-gradient hover:opacity-90 text-white rounded-xl gap-2"
                      size="sm"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {uploadingLogo ? "Subiendo..." : "🏢 Subir logo de empresa"}
                    </Button>
                  </div>
                )}
              </div>
              {message.role === "user" && (
                <Avatar className="h-9 w-9 border-2 border-primary/30 shadow-lg flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-white">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3 animate-fade-in">
            <Avatar className="h-9 w-9 border-2 border-primary/30 shadow-lg alicia-shadow flex-shrink-0 animate-pulse-glow">
              <AvatarImage src={aliciaAvatar} alt="Alic.ia" className="object-cover" />
              <AvatarFallback className="alicia-gradient text-white text-sm font-bold animate-gradient">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-gradient-to-br from-card to-primary/5 border border-primary/20 rounded-2xl px-5 py-3.5 shadow-lg backdrop-blur-sm">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 alicia-gradient rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2.5 h-2.5 alicia-gradient rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2.5 h-2.5 alicia-gradient rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer con input mejorado */}
      <div className="relative z-10 border-t border-primary/20 p-5 bg-gradient-to-t from-card/90 to-background/90 backdrop-blur-md">
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Escribe tu mensaje a Alic.ia..."
            disabled={isLoading}
            className="flex-1 bg-background/50 border-primary/30 focus:border-primary focus:ring-primary/30 transition-all rounded-xl text-base shadow-inner backdrop-blur-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="alicia-gradient hover:opacity-90 transition-opacity shadow-lg alicia-shadow h-10 w-10 rounded-xl"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
