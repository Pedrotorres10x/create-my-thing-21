import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
      <DialogContent className="sm:max-w-md border-primary/20 shadow-xl">
        <div className="flex justify-center mb-4 mt-2">
          <Avatar className="h-20 w-20 border-4 border-primary/20 shadow-lg">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl font-bold">
              A
            </AvatarFallback>
          </Avatar>
        </div>

        <DialogTitle className="text-center text-2xl font-bold">
          ¡Hola {userName}! 👋
        </DialogTitle>

        <div className="py-6 px-2 min-h-[100px]">
          {initializing ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </div>
          ) : (
            <p className="text-base leading-relaxed text-center text-foreground/90">
              {message}
            </p>
          )}
        </div>

        <div className="flex gap-3 justify-center pb-2">
          <Button variant="outline" onClick={handleClose}>
            Gracias
          </Button>
          <Button onClick={handleOpenFullChat} className="shadow-md">
            Abrir chat completo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
