import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Home } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SphereNotifications } from "./sphere/SphereNotifications";
import { PushNotificationToggle } from "./PushNotificationToggle";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadProfessional();
    }
  }, [user]);

  const loadProfessional = async () => {
    const { data } = await supabase
      .from("professionals")
      .select("id, full_name, photo_url, business_sphere_id")
      .eq("user_id", user?.id)
      .maybeSingle();
    setProfessional(data);
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-background sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm font-semibold tracking-tight text-foreground">CONECTOR</span>
            </div>
            
            <div className="flex items-center gap-1">
              <PushNotificationToggle professionalId={professional?.id || null} />
              {professional?.business_sphere_id && professional?.id && (
                <SphereNotifications professionalId={professional.id} />
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={professional?.photo_url || ""} />
                      <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                        {professional?.full_name?.charAt(0) || <User className="h-3 w-3" />}
                      </AvatarFallback>
                    </Avatar>
                    {professional?.full_name && (
                      <span className="hidden lg:inline text-xs max-w-[120px] truncate">
                        {professional.full_name}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="text-sm cursor-pointer">
                    <User className="mr-2 h-3.5 w-3.5" />
                    Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="text-sm cursor-pointer">
                    <Home className="mr-2 h-3.5 w-3.5" />
                    Inicio
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive text-sm cursor-pointer">
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
