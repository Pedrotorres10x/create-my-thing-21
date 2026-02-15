import { Home, Users, Handshake, Calendar, MessageSquare, UserCircle, Shield, AlertTriangle, Scale, Send, Zap } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useEthicsCommittee } from "@/hooks/useEthicsCommittee";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useSidebarTutorial } from "@/components/SidebarTutorialContext";
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
  const { active: tutorialActive, highlightedUrl, showingExplanation, onHighlightedClick } = useSidebarTutorial();

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

  const mainItems = (hasProfile || tutorialActive) ? [...coreItems, ...expandedMainItems] : coreItems;

  const linkBase = [
    "sidebar-key",
    "rounded-xl text-[13px] font-medium h-10 gap-3 px-3",
    "border border-border/40 bg-white/50",
    "shadow-[0_1px_2px_hsl(210_20%_50%/0.06),inset_0_1px_0_hsl(0_0%_100%/0.7)]",
    "text-foreground/60",
    "transition-all duration-150 ease-out",
    "hover:text-foreground hover:bg-white/90 hover:border-border hover:shadow-[0_4px_12px_hsl(210_20%_50%/0.12),inset_0_1px_0_hsl(0_0%_100%/0.8)] hover:scale-[1.03] hover:-translate-y-px",
    "active:scale-[0.97] active:shadow-[inset_0_2px_4px_hsl(210_20%_50%/0.1)] active:translate-y-px",
  ].join(" ");

  const linkActive = [
    "!bg-gradient-to-r !from-primary/10 !to-accent/5 !text-primary !font-semibold",
    "!border-primary/25 !shadow-[0_4px_16px_hsl(24_90%_52%/0.12),inset_0_1px_0_hsl(0_0%_100%/0.6)]",
  ].join(" ");

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-bold px-4 mb-2 mt-1">
      {open ? children : ""}
    </SidebarGroupLabel>
  );

  const Divider = () => (
    <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
  );

  const renderItems = (items: typeof coreItems) => (
    <SidebarMenu className="space-y-1.5 px-2.5">
      {items.map((item) => {
        const isHighlighted = tutorialActive && !showingExplanation && highlightedUrl === item.url;
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild>
              <NavLink
                to={item.url}
                end
                className={`${linkBase} ${isHighlighted ? "relative z-[95] ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse shadow-[0_0_20px_hsl(24_90%_52%/0.4)]" : ""}`}
                activeClassName={linkActive}
                onClick={(e) => {
                  if (isHighlighted) {
                    e.preventDefault();
                    onHighlightedClick();
                  }
                }}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {open && <span>{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar className={`${open ? "w-56" : "w-14"} ${tutorialActive ? "z-[95]" : ""}`} collapsible="icon">
      <SidebarContent
        className="pt-0 border-r border-border/40"
        style={{
          background: 'linear-gradient(180deg, hsla(210, 30%, 97%, 0.85) 0%, hsla(24, 20%, 97%, 0.75) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
      >
        {/* Logo */}
        {open ? (
          <div className="px-5 py-5 mb-1 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 border border-white/30">
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-foreground">CONECTOR</span>
              <span className="text-[10px] text-muted-foreground/50 leading-none font-medium">Genera Clientes</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-4 mb-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 border border-white/30">
              <Zap className="h-4 w-4 text-white" />
            </div>
          </div>
        )}

        <Divider />

        <SidebarGroup>
          <SectionTitle>Mi Juego</SectionTitle>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>

        {(hasProfile || tutorialActive) && (
          <>
            <Divider />
            <SidebarGroup>
              <SectionTitle>La Tribu</SectionTitle>
              <SidebarGroupContent>{renderItems(communityItems)}</SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {isCommitteeMember && (
          <>
            <Divider />
            <SidebarGroup>
              <SectionTitle>Ética</SectionTitle>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1.5 px-2.5">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/ethics-committee" end className={linkBase} activeClassName={linkActive}>
                        <Scale className="h-4 w-4 shrink-0" />
                        {open && <span>Comité Ética</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {isAdmin && (
          <>
            <Divider />
            <SidebarGroup>
              <SectionTitle>Admin</SectionTitle>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1.5 px-2.5">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin" end className={linkBase} activeClassName={linkActive}>
                        <Shield className="h-4 w-4 shrink-0" />
                        {open && <span>Admin</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin/moderation" className={linkBase} activeClassName={linkActive}>
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {open && <span>Moderación</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
