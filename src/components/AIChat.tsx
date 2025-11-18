import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { AIUsageIndicator } from "./subscription/AIUsageIndicator";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIChat() {
  const navigate = useNavigate();
  const { canSendAIMessage, incrementAIMessages } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "¡Hola! 👋 Soy tu asistente en CONECTOR. Puedo ayudarte a navegar por la plataforma, explicarte cómo funcionan las diferentes secciones y responder tus dudas. ¿En qué puedo ayudarte hoy?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conector-chat`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Check AI message limit
    if (!canSendAIMessage) {
      toast.error("Has alcanzado el límite de mensajes de IA", {
        description: "Actualiza tu plan para continuar usando el asistente de IA.",
        action: {
          label: "Ver planes",
          onClick: () => navigate("/subscriptions"),
        },
      });
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

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
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
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
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[700px] border-border/40 shadow-lg">
      {/* Chat Header */}
      <div className="p-4 border-b border-border/40 space-y-3 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Asistente Conector</h3>
            <p className="text-xs text-muted-foreground">Siempre aquí para ayudarte</p>
          </div>
        </div>
        <AIUsageIndicator />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <Avatar className={cn(
              "h-8 w-8 shrink-0",
              message.role === "assistant" && "border-2 border-primary/20"
            )}>
              <AvatarFallback className={cn(
                message.role === "user" 
                  ? "bg-gradient-to-br from-secondary to-secondary/70" 
                  : "bg-gradient-to-br from-primary to-primary/70"
              )}>
                {message.role === "user" ? (
                  <span className="text-secondary-foreground font-semibold">Tú</span>
                ) : (
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                )}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 max-w-[80%] shadow-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-card border border-border/40"
              )}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
            <Avatar className="h-8 w-8 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="rounded-2xl px-4 py-2.5 bg-card border border-border/40">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border/40 bg-background">
        {!canSendAIMessage && (
          <div className="mb-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-xs text-destructive">
              Has alcanzado el límite de mensajes. 
              <button 
                onClick={() => navigate("/subscriptions")}
                className="ml-1 underline font-medium hover:text-destructive/80"
              >
                Actualiza tu plan
              </button>
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={canSendAIMessage ? "Escribe tu mensaje..." : "Límite alcanzado"}
            disabled={isLoading || !canSendAIMessage}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || !canSendAIMessage}
            size="icon"
            className="shrink-0"
          >
            {!canSendAIMessage ? (
              <Lock className="h-4 w-4" />
            ) : isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
