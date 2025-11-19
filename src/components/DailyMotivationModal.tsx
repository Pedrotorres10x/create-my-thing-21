import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const MOTIVATIONAL_MESSAGES = [
  {
    title: "¡Construye conexiones significativas!",
    message: "Cada conversación es una oportunidad de crear valor. Hoy es el día perfecto para conectar con otro profesional."
  },
  {
    title: "¡El networking es poder!",
    message: "Las mejores oportunidades vienen de las relaciones que construyes. Sigue expandiendo tu red de contactos."
  },
  {
    title: "¡Comparte tu experiencia!",
    message: "Tu conocimiento puede transformar el negocio de alguien más. Participa activamente en la comunidad hoy."
  },
  {
    title: "¡Crece junto a otros!",
    message: "El éxito se multiplica cuando se comparte. Busca colaboraciones que impulsen a todos hacia adelante."
  },
  {
    title: "¡Tu presencia cuenta!",
    message: "Cada interacción en la plataforma fortalece la comunidad. Sigue activo y aprovecha todas las oportunidades."
  },
  {
    title: "¡Aprende algo nuevo hoy!",
    message: "Cada profesional tiene algo valioso que enseñar. Mantén la curiosidad y aprovecha los tutoriales disponibles."
  },
  {
    title: "¡Las oportunidades te esperan!",
    message: "La plaza premium está llena de posibilidades. Explora ofertas y comparte las tuyas con la comunidad."
  }
];

export const DailyMotivationModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(MOTIVATIONAL_MESSAGES[0]);

  useEffect(() => {
    const lastShown = localStorage.getItem("lastMotivationShown");
    const today = new Date().toDateString();

    if (lastShown !== today) {
      // Select a random message
      const randomMessage = MOTIVATIONAL_MESSAGES[
        Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)
      ];
      setMessage(randomMessage);
      
      // Show modal after a short delay for better UX
      setTimeout(() => {
        setIsOpen(true);
      }, 1000);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("lastMotivationShown", new Date().toDateString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">{message.title}</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {message.message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button onClick={handleClose} className="w-full sm:w-auto">
            ¡Entendido!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
