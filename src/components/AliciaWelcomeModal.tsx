import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, MessageCircle } from "lucide-react";

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

    const fetchInitialMessage = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      try {
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conector-chat`;
        const response = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullMessage += content;
                  setMessage(fullMessage);
                  setInitializing(false);
                }
              } catch (e) {
                console.error("Error parsing chunk:", e);
              }
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
  }, [professionalId]);

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
      <DialogContent className="sm:max-w-lg border-none shadow-2xl bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-40 h-40 alicia-gradient rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/30 rounded-full blur-2xl animate-float" />
        </div>

        <div className="relative z-10">
          {/* Avatar prominente con animación */}
          <div className="flex justify-center mb-6 mt-4">
            <div className="relative animate-float">
              <Avatar className="h-28 w-28 border-4 border-primary/20 shadow-2xl alicia-shadow">
                <AvatarFallback className="alicia-gradient text-white text-4xl font-bold animate-gradient">
                  A
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 animate-pulse">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          </div>

          <DialogTitle className="text-center text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
            ¡Hola {userName}! 👋
          </DialogTitle>

          <DialogDescription className="text-center text-muted-foreground mb-4">
            Soy Alic.ia, tu asistente personal de IA
          </DialogDescription>

          <div className="py-8 px-4 min-h-[120px] bg-card/50 backdrop-blur-sm rounded-2xl border border-primary/10 shadow-inner">
            {initializing ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-primary/10" />
                <Skeleton className="h-4 w-full bg-secondary/10" />
                <Skeleton className="h-4 w-3/4 mx-auto bg-accent/10" />
              </div>
            ) : (
              <p className="text-base leading-relaxed text-center text-foreground font-medium">
                {message}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-center mt-6 pb-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            >
              Gracias
            </Button>
            <Button 
              onClick={handleOpenFullChat} 
              className="alicia-gradient hover:opacity-90 transition-opacity shadow-lg alicia-shadow group"
            >
              <MessageCircle className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
              Abrir chat completo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
