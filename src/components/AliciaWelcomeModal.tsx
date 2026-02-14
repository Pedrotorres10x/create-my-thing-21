import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AliciaWelcomeModalProps {
  professionalId: string;
  userName?: string;
  onOpenFullChat?: () => void;
}

export const AliciaWelcomeModal = ({ 
  professionalId, 
  userName = "amigo",
  onOpenFullChat 
}: AliciaWelcomeModalProps) => {
  const { session, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [initializing, setInitializing] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const checkSessionStorage = sessionStorage.getItem('alicia-greeting-shown');
    if (checkSessionStorage) {
      setOpen(false);
      return;
    }

    // Wait for auth to be ready
    if (authLoading || !session?.access_token) {
      return;
    }

    const fetchInitialMessage = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      try {
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conector-chat`;
        const response = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: "[INICIO_SESION]" }],
            professionalId: professionalId,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Failed to start stream");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullMessage = "";
        let textBuffer = "";

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
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullMessage += content;
                setMessage(fullMessage);
                setInitializing(false);
              }
            } catch {
              // Incomplete JSON, put line back in buffer
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
      } catch (error) {
        console.error("Error fetching initial message:", error);
        setMessage("¡Hola! 👋 Soy Alic.ia, tu asistente personal. Estoy aquí para ayudarte a alcanzar tus objetivos en la red.");
        setInitializing(false);
      }
    };

    if (professionalId) {
      fetchInitialMessage();
    }
  }, [professionalId, authLoading, session]);

  const handleClose = () => {
    sessionStorage.setItem('alicia-greeting-shown', 'true');
    setOpen(false);
  };

  const handleOpenFullChat = () => {
    sessionStorage.setItem('alicia-greeting-shown', 'true');
    setOpen(false);
    if (onOpenFullChat) {
      onOpenFullChat();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg border-none shadow-lg bg-background/95 backdrop-blur-sm overflow-hidden">
        {/* Sutil decoración de fondo */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-24 h-24 alicia-gradient rounded-full blur-2xl" />
        </div>

        <div className="relative z-10">
          {/* Avatar más pequeño y limpio */}
          <div className="flex justify-center mb-4 mt-2">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-lg alicia-shadow">
                <AvatarFallback className="alicia-gradient text-white text-3xl font-bold">
                  A
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5">
                <Sparkles className="h-3 w-3" />
              </div>
            </div>
          </div>

          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-1">
            ¡Hola {userName}!
          </DialogTitle>

          <DialogDescription className="text-center text-muted-foreground text-sm mb-4">
            Soy Alic.ia, tu asistente de IA
          </DialogDescription>

          <div className="py-6 px-4 min-h-[100px] bg-card/30 rounded-xl border border-border/50">
            {initializing ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full bg-primary/10" />
                <Skeleton className="h-3 w-4/5 mx-auto bg-secondary/10" />
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-center text-foreground">
                {message}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-center mt-4 pb-1">
            <Button 
              variant="outline" 
              onClick={handleClose}
              size="sm"
              className="border-border hover:bg-accent/10"
            >
              Gracias
            </Button>
            <Button 
              onClick={handleOpenFullChat} 
              size="sm"
              className="alicia-gradient hover:opacity-90 transition-opacity shadow-md group"
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              Abrir chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
