import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  read: boolean;
  reference_id?: string;
}

interface SphereNotificationsProps {
  professionalId: string;
}

export const SphereNotifications = ({ professionalId }: SphereNotificationsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!professionalId) return;
    
    loadNotifications();
    
    // Subscribe to new sphere references
    const channel = supabase
      .channel('sphere-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sphere_internal_references',
          filter: `referred_to_id=eq.${professionalId}`
        },
        (payload) => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [professionalId]);

  const loadNotifications = async () => {
    try {
      // Load pending references as notifications
      const { data: references } = await supabase
        .from("sphere_internal_references")
        .select(`
          id,
          client_name,
          service_needed,
          status,
          created_at,
          referrer:professionals!sphere_internal_references_referrer_id_fkey(
            full_name
          )
        `)
        .eq("referred_to_id", professionalId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (references) {
        const notifs: Notification[] = references.map((ref: any) => ({
          id: ref.id,
          type: "sphere_reference",
          message: `${ref.referrer.full_name} te refirió a ${ref.client_name} para ${ref.service_needed}`,
          created_at: ref.created_at,
          read: false,
          reference_id: ref.id
        }));

        setNotifications(notifs);
        setUnreadCount(notifs.length);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    navigate("/mi-esfera", { state: { tab: "references" } });
    setOpen(false);
  };

  const markAllAsRead = async () => {
    // This is a visual mark - actual completion happens in the references manager
    setUnreadCount(0);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaciones de Esfera</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full p-4 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-tight">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(notification.created_at), "d MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
