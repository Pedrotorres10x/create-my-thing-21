import { Home, Users, Handshake, Calendar, MessageSquare, UserCircle, Shield, AlertTriangle, Scale, Send, Zap } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useEthicsCommittee } from "@/hooks/useEthicsCommittee";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const coreItems = [
  { title: "Alic.IA", url: "/dashboard", icon: Home },
  { title: "Mi Perfil", url: "/profile", icon: UserCircle },
];

const expandedMainItems = [
  { title: "Mis Invitados", url: "/referrals", icon: Handshake },
  { title: "Recomendación", url: "/recomendacion", icon: Send },
];

const communityItems = [
  { title: "Mi Tribu", url: "/mi-tribu", icon: Users },
  { title: "El Cafelito", url: "/meetings", icon: Calendar },
  { title: "Somos Únicos", url: "/somos-unicos", icon: MessageSquare },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { isCommitteeMember } = useEthicsCommittee();
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("professionals")
        .select("id, full_name, chapter_id")
        .eq("user_id", user.id)
        .maybeSingle();
      setHasProfile(!!data?.full_name);
    };
    check();
  }, [user]);

  const mainItems = hasProfile ? [...coreItems, ...expandedMainItems] : coreItems;

  const linkClass = "rounded-lg text-[13px] font-medium transition-all duration-150 text-foreground/60 hover:text-foreground hover:bg-primary/8 h-9 gap-3";
  const activeClass = "bg-primary/10 text-primary font-semibold shadow-sm";

  return (
    <Sidebar className={open ? "w-56" : "w-14"} collapsible="icon">
      <SidebarContent className="pt-0 border-r border-border/60 bg-card/80 backdrop-blur-sm">
        {/* Logo area */}
        {open ? (
          <div className="px-5 py-5 mb-1 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground">CONECTOR</span>
              <span className="text-[10px] text-muted-foreground leading-none">Networking Pro</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-4 mb-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <Zap className="h-4 w-4 text-white" />
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold px-4 mb-1">
            {open ? "Mi Juego" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2.5">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={linkClass} activeClassName={activeClass}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasProfile && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold px-4 mb-1">
              {open ? "La Tribu" : ""}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2.5">
                {communityItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={linkClass} activeClassName={activeClass}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isCommitteeMember && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold px-4 mb-1">
              {open ? "Ética" : ""}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/ethics-committee" end className={linkClass} activeClassName={activeClass}>
                      <Scale className="h-4 w-4 shrink-0" />
                      {open && <span>Comité Ética</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold px-4 mb-1">
              {open ? "Admin" : ""}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2.5">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" end className={linkClass} activeClassName={activeClass}>
                      <Shield className="h-4 w-4 shrink-0" />
                      {open && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/moderation" className={linkClass} activeClassName={activeClass}>
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {open && <span>Moderación</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
