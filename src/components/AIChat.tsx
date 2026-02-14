import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, User, Sparkles, Bot, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conector-chat`;
  const hasInitialized = useRef(false);
  const isStreamingRef = useRef(false);

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
      
      // Check header for 'kid' field (user tokens have this, anon keys don't)
      const header = JSON.parse(atob(parts[0]));
      if (!header.kid) {
        console.log('Token missing kid in header - likely anon key');
        return false;
      }
      
      // Check payload for authenticated role and user ID
      const payload = JSON.parse(atob(parts[1]));
      const isValid = payload.role === 'authenticated' && !!payload.sub;
      if (!isValid) {
        console.log('Token validation failed:', { role: payload.role, hasSub: !!payload.sub });
      }
      return isValid;
    } catch (e) {
      console.error('Token validation error:', e);
      return false;
    }
  };

  // Generar mensaje inicial proactivo de Alicia cuando el usuario entra
  useEffect(() => {
    // Wait for auth to be fully ready
    if (authLoading || !user || !session?.access_token) {
      return;
    }

    // Capture the validated token immediately from the session
    const validatedToken = session.access_token;

    // Validate token is authenticated user token, not anon key
    if (!isAuthenticatedToken(validatedToken)) {
      console.log('Token not authenticated yet, waiting for auth session');
      return;
    }

    // Only mark as initialized AFTER we've confirmed we have an authenticated token
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    // Pass the validated token to the async function to avoid race conditions
    const initializeChat = async (accessToken: string) => {
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

        // Use the validated token passed as parameter, not a fresh fetch
        isStreamingRef.current = true;

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ 
            messages: [{ role: "user", content: "[INICIO_SESION]" }],
            professionalId: professional.id
          }),
        });

        if (!resp.ok) {
          if (resp.status === 401) {
            console.log('Got 401, will retry when session updates');
            hasInitialized.current = false;
            isStreamingRef.current = false;
            return;
          }
          console.error('Chat init failed:', resp.status);
          setInitializing(false);
          isStreamingRef.current = false;
          return;
        }

        if (!resp.body) {
          setInitializing(false);
          isStreamingRef.current = false;
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let assistantContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                assistantContent += content;
                setMessages([{ role: "assistant", content: assistantContent }]);
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        isStreamingRef.current = false;
        setInitializing(false);
        scrollToBottomIfNeeded(true);
      } catch (error) {
        console.error("Error initializing chat:", error);
        isStreamingRef.current = false;
        setInitializing(false);
      }
    };

    initializeChat(validatedToken);
  }, [authLoading, user, session, CHAT_URL]);


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

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
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
              <p className="text-xs md:text-sm text-white/90 font-medium">Tu asistente personal inteligente</p>
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
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                }} />
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
