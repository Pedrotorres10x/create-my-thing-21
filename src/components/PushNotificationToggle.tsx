import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";

interface PushNotificationToggleProps {
  professionalId: string | null;
}

export function PushNotificationToggle({ professionalId }: PushNotificationToggleProps) {
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } = usePushNotifications(professionalId);

  if (!isSupported) return null;

  const handleToggle = async () => {
    // If permission is already denied, guide the user
    if (!isSubscribed && Notification.permission === "denied") {
      toast({
        title: "🔒 Notificaciones bloqueadas por el navegador",
        description: "Haz clic en el icono de candado 🔒 en la barra de direcciones de tu navegador → Permisos → Notificaciones → Permitir. Luego recarga la página.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    if (isSubscribed) {
      await unsubscribe();
      toast({
        title: "Notificaciones desactivadas",
        description: "Ya no recibirás notificaciones push",
      });
    } else {
      const success = await subscribe();
      if (success) {
        toast({
          title: "🔔 ¡Notificaciones activadas!",
          description: "Te avisaremos de referencias, reuniones y oportunidades",
        });
      } else if (Notification.permission === "denied") {
        toast({
          title: "🔒 Notificaciones bloqueadas por el navegador",
          description: "Haz clic en el icono de candado 🔒 en la barra de direcciones → Permisos → Notificaciones → Permitir. Luego recarga la página.",
          variant: "destructive",
          duration: 10000,
        });
      }
    }
  };

  return (
    <Button
      variant={isSubscribed ? "ghost" : "outline"}
      size="icon"
      onClick={handleToggle}
      disabled={loading}
      className="relative"
      title={isSubscribed ? "Desactivar notificaciones" : "Activar notificaciones push"}
    >
      {isSubscribed ? (
        <BellRing className="h-5 w-5 text-primary" />
      ) : (
        <BellOff className="h-5 w-5 text-muted-foreground" />
      )}
    </Button>
  );
}
