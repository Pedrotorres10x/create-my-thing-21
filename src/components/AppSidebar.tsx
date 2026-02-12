import { Home, Users, Handshake, Calendar, MessageSquare, Trophy, UserCircle, Shield, AlertTriangle, Scale, Globe } from "lucide-react";
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
  { title: "Mi Refugio", url: "/dashboard", icon: Home },
  { title: "Mi Tótem", url: "/profile", icon: UserCircle },
];

const expandedMainItems = [
  { title: "Mis Senderos", url: "/referrals", icon: Handshake },
  { title: "Mi Tribu", url: "/chapter", icon: Users },
];

const communityItems = [
  { title: "Mi Aldea", url: "/mi-esfera", icon: Globe },
  { title: "El Ritual", url: "/meetings", icon: Calendar },
  { title: "La Fogata", url: "/feed", icon: MessageSquare },
  { title: "La Cumbre", url: "/rankings", icon: Trophy },
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

  // New users only see core items until they have a profile
  const mainItems = hasProfile ? [...coreItems, ...expandedMainItems] : coreItems;

  return (
    <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Mi Tierra</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
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
            <SidebarGroupLabel>La Tribu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {communityItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
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
            <SidebarGroupLabel>Comité de Ética</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/ethics-committee"
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
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
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
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
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
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
