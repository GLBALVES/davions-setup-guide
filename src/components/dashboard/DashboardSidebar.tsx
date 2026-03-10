import { useState } from "react";
import {
  LogOut,
  ChevronRight,
  Star,
  Camera,
  Megaphone,
  BrainCircuit,
  DollarSign,
  Users2,
  GitBranch,
  Settings,
  Puzzle,
  Globe,
  BookText,
  Share2,
  SearchCheck,
  Mail,
  Bell,
  MessageCircle,
  Bot,
  Zap,
  Lightbulb,
  Wand2,
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  BarChart3,
  CalendarDays,
  UserPlus,
  Columns,
  RefreshCw,
  UserCircle,
  ShieldCheck,
  PlusSquare,
  ScanEye,
  Images,
  BookOpen,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import seloPreto from "@/assets/selo_preto.png";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

type MenuItem = {
  title: string;
  icon: React.ElementType;
  to?: string;
  end?: boolean;
};

type MenuGroup = {
  title: string;
  icon: React.ElementType;
  items: MenuItem[];
};

const groups: MenuGroup[] = [
  {
    title: "Favorites",
    icon: Star,
    items: [
      { title: "Starred Functions", icon: Star },
    ],
  },
  {
    title: "Photographers",
    icon: Camera,
    items: [
      { title: "Dashboard", icon: LayoutDashboard, to: "/dashboard", end: true },
      { title: "Sessions", icon: CalendarDays, to: "/dashboard/sessions" },
      { title: "Bookings", icon: BookOpen, to: "/dashboard/bookings" },
      { title: "Proof Galleries", icon: ScanEye, to: "/dashboard/galleries?type=proof" },
      { title: "Final Galleries", icon: Images, to: "/dashboard/galleries?type=final" },
    ],
  },
  {
    title: "Marketing",
    icon: Megaphone,
    items: [
      { title: "Website", icon: Globe },
      { title: "Blog", icon: BookText },
      { title: "Social Media", icon: Share2 },
      { title: "SEO", icon: SearchCheck },
      { title: "Emails", icon: Mail },
      { title: "Push", icon: Bell },
      { title: "WhatsApp", icon: MessageCircle },
    ],
  },
  {
    title: "AI",
    icon: BrainCircuit,
    items: [
      { title: "AI Agents", icon: Bot },
      { title: "AI Automations", icon: Zap },
      { title: "Smart Suggestions", icon: Lightbulb },
      { title: "Creative Assistant", icon: Wand2 },
    ],
  },
  {
    title: "Finance",
    icon: DollarSign,
    items: [
      { title: "Dashboard", icon: LayoutDashboard },
      { title: "Receivables", icon: ArrowDownCircle },
      { title: "Payables", icon: ArrowUpCircle },
      { title: "Cash Flow", icon: TrendingUp },
      { title: "Reports", icon: BarChart3 },
    ],
  },
  {
    title: "CRM",
    icon: Users2,
    items: [
      { title: "Sessions", icon: CalendarDays },
      { title: "Leads", icon: UserPlus },
    ],
  },
  {
    title: "Workflows",
    icon: GitBranch,
    items: [
      { title: "Kanban", icon: Columns },
      { title: "Recurring Workflows", icon: RefreshCw },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      { title: "My Profile", icon: UserCircle, to: "/dashboard/settings" },
      { title: "Access Control", icon: ShieldCheck },
    ],
  },
  {
    title: "My Features",
    icon: Puzzle,
    items: [
      { title: "Create Feature", icon: PlusSquare },
    ],
  },
];

interface DashboardSidebarProps {
  onSignOut: () => void;
  userEmail?: string | null;
}

export function DashboardSidebar({ onSignOut, userEmail }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isItemActive = (item: MenuItem): boolean => {
    if (!item.to) return false;
    const [pathname, search] = item.to.split("?");
    if (!location.pathname.startsWith(pathname)) return false;
    if (item.end && location.pathname !== pathname) return false;
    if (search && !location.search) return false;
    if (!search) return true;
    const params = new URLSearchParams(location.search);
    const expected = new URLSearchParams(search);
    for (const [key, val] of expected.entries()) {
      if (params.get(key) !== val) return false;
    }
    return true;
  };

  const groupHasActive = (group: MenuGroup) =>
    group.items.some((item) => isItemActive(item));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach((g) => {
      initial[g.title] = groupHasActive(g);
    });
    return initial;
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 flex items-center justify-center border-b border-sidebar-border">
          <img
            src={seloPreto}
            alt="Davions"
            className={collapsed ? "h-6 w-auto" : "h-8 w-auto"}
          />
        </div>

        {groups.map((group) => (
          <Collapsible
            key={group.title}
            open={!collapsed && openGroups[group.title]}
            onOpenChange={() => toggleGroup(group.title)}
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-light hover:text-foreground transition-colors">
                  {collapsed ? (
                    <group.icon className="h-4 w-4 shrink-0" />
                  ) : (
                    <>
                      <group.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left">{group.title}</span>
                      <ChevronRight
                        className="h-3 w-3 shrink-0 transition-transform duration-200"
                        style={{
                          transform: openGroups[group.title] ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                      />
                    </>
                  )}
                </CollapsibleTrigger>
              </SidebarGroupLabel>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        {item.to ? (
                          <SidebarMenuButton
                            asChild
                            isActive={isItemActive(item)}
                            tooltip={item.title}
                          >
                            <NavLink
                              to={item.to}
                              end={item.end}
                              className="gap-3 text-xs tracking-wider uppercase font-light hover:bg-sidebar-accent/50"
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              {!collapsed && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            disabled
                            tooltip={item.title}
                            className="gap-3 text-xs tracking-wider uppercase font-light opacity-40 cursor-not-allowed"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span>{item.title}</span>}
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && userEmail && (
          <p className="text-[10px] text-muted-foreground truncate mb-2 px-2">
            {userEmail}
          </p>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onSignOut}
              tooltip="Sign out"
              className="gap-3 text-xs tracking-wider uppercase font-light text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
