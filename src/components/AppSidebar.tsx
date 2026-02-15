import { Home, Users, Handshake, Calendar, MessageSquare, Trophy, UserCircle, Shield, AlertTriangle, Scale, Send } from "lucide-react";
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

  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;

  const mainItems = hasProfile ? [...coreItems, ...expandedMainItems] : coreItems;

  const linkClass = "rounded-xl transition-all duration-200 hover:bg-accent";
  const activeClass = "bg-accent text-foreground font-semibold";

  return (
    <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium px-3">Mi Tierra</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={linkClass}
                      activeClassName={activeClass}
                    >
                      <item.icon className="h-4 w-4" />
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
            <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium px-3">La Tribu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                {communityItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={linkClass}
                        activeClassName={activeClass}
                      >
                        <item.icon className="h-4 w-4" />
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
            <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium px-3">Comité de Ética</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/ethics-committee"
                      end
                      className={linkClass}
                      activeClassName={activeClass}
                    >
                      <Scale className="h-4 w-4" />
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
            <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/70 font-medium px-3">Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      end
                      className={linkClass}
                      activeClassName={activeClass}
                    >
                      <Shield className="h-4 w-4" />
                      {open && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin/moderation"
                      className={linkClass}
                      activeClassName={activeClass}
                    >
                      <AlertTriangle className="h-4 w-4" />
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
