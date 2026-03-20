import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Instagram,
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
  CalendarCheck2,
  UserPlus,
  Columns,
  RefreshCw,
  UserCircle,
  ShieldCheck,
  PlusSquare,
  ScanEye,
  Images,
  BookOpen,
  Pin,
  PinOff,
  GripVertical,
  Pencil,
  Check,
  CreditCard,
  SlidersHorizontal,
  HelpCircle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import seloPreto from "@/assets/selo_preto.png";
import logoPrincipal from "@/assets/logo_principal_preto.png";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStudioPermissions } from "@/hooks/useStudioPermissions";
import { useLanguage } from "@/contexts/LanguageContext";

type MenuItem = {
  title: string;
  icon: React.ElementType;
  to?: string;
  end?: boolean;
  badgeKey?: "pendingBookings" | "draftSessions";
  /** permission key from PERMISSION_GROUPS; undefined = always visible */
  permKey?: string;
};

type MenuGroup = {
  /** Stable English key — used for state management & DB keys */
  stableKey: string;
  /** Translated display label */
  title: string;
  icon: React.ElementType;
  items: MenuItem[];
  defaultOpen?: boolean;
  /** Set to true to temporarily hide this group from the sidebar */
  disabled?: boolean;
};

/** Stable English items list — used only for key generation & matching */
const ALL_ITEMS: (MenuItem & { groupTitle: string })[] = [];

function buildGroups(t: ReturnType<typeof useLanguage>["t"]): MenuGroup[] {
  return [
    {
      stableKey: "Photographers",
      title: t.nav.photographers,
      icon: Camera,
      defaultOpen: true,
      items: [
        { title: t.nav.projects, icon: Columns, to: "/dashboard/projects" },
        { title: t.nav.dashboard, icon: LayoutDashboard, to: "/dashboard", end: true },
        { title: t.nav.sessions, icon: CalendarDays, to: "/dashboard/sessions", badgeKey: "draftSessions", permKey: "sessions" },
        { title: t.nav.schedule, icon: CalendarCheck2, to: "/dashboard/schedule", permKey: "schedule" },
        { title: t.nav.bookings, icon: BookOpen, to: "/dashboard/bookings", badgeKey: "pendingBookings", permKey: "bookings" },
        { title: t.nav.proofGalleries, icon: ScanEye, to: "/dashboard/galleries?type=proof", permKey: "galleries" },
        { title: t.nav.finalGalleries, icon: Images, to: "/dashboard/galleries?type=final", permKey: "galleries" },
        { title: t.nav.personalize, icon: Wand2, to: "/dashboard/personalize" },
      ],
    },
    {
      stableKey: "Marketing",
      title: t.nav.marketing,
      icon: Megaphone,
      disabled: true,
      items: [
        { title: t.nav.website, icon: Globe, to: "/dashboard/website", permKey: "website" },
        { title: t.nav.blog, icon: BookText, to: "/dashboard/blog", permKey: "blog" },
        { title: t.nav.creativeStudio, icon: Share2, to: "/dashboard/creative", permKey: "creative" },
        { title: t.nav.socialMedia, icon: Instagram, to: "/dashboard/social-media" },
        { title: t.nav.seo, icon: SearchCheck, to: "/dashboard/seo", permKey: "seo" },
        { title: t.nav.emails, icon: Mail, to: "/dashboard/emails", permKey: "emails" },
        { title: t.nav.push, icon: Bell, to: "/dashboard/push", permKey: "push" },
        { title: t.nav.chat, icon: MessageCircle, to: "/dashboard/chat", permKey: "chat" },
      ],
    },
    {
      stableKey: "AI",
      title: t.nav.ai,
      icon: BrainCircuit,
      disabled: true,
      items: [
        { title: t.nav.aiAgents, icon: Bot, to: "/dashboard/agents", permKey: "agents" },
        { title: t.nav.aiAutomations, icon: Zap },
        { title: t.nav.smartSuggestions, icon: Lightbulb },
        { title: t.nav.creativeAssistant, icon: Wand2 },
      ],
    },
    {
      stableKey: "Finance",
      title: t.nav.finance,
      icon: DollarSign,
      disabled: true,
      items: [
        { title: t.nav.revenue,           icon: TrendingUp,      to: "/dashboard/revenue" },
        { title: t.nav.financeDashboard,  icon: LayoutDashboard, to: "/dashboard/finance", end: true },
        { title: t.nav.receivables,       icon: ArrowDownCircle, to: "/dashboard/finance/receivables" },
        { title: t.nav.payables,          icon: ArrowUpCircle,   to: "/dashboard/finance/payables" },
        { title: t.nav.cashFlow,          icon: TrendingUp,      to: "/dashboard/finance/cashflow" },
        { title: t.nav.reports,           icon: BarChart3,       to: "/dashboard/finance/reports" },
      ],
    },
    {
      stableKey: "CRM",
      title: t.nav.crm,
      icon: Users2,
      disabled: true,
      items: [
        { title: t.nav.clients, icon: UserCircle, to: "/dashboard/clients", permKey: "clients" },
        { title: t.nav.leads, icon: UserPlus },
      ],
    },
    {
      stableKey: "Workflows",
      title: t.nav.workflows,
      icon: GitBranch,
      disabled: true,
      items: [
        { title: t.nav.kanban, icon: Columns, to: "/dashboard/workflow", permKey: "workflow" },
        { title: t.nav.recurringWorkflows, icon: RefreshCw, to: "/dashboard/recurring", permKey: "recurring" },
      ],
    },
    {
      stableKey: "Settings",
      title: t.nav.settings,
      icon: Settings,
      items: [
        { title: t.nav.myProfile, icon: UserCircle, to: "/dashboard/settings" },
        { title: t.nav.billing, icon: CreditCard, to: "/dashboard/billing" },
        { title: t.nav.accessControl, icon: ShieldCheck, to: "/dashboard/access-control" },
        { title: t.nav.helpCenter, icon: HelpCircle, to: "/dashboard/help" },
      ],
    },
    {
      stableKey: "My Features",
      title: t.nav.myFeatures,
      icon: Puzzle,
      disabled: true,
      items: [
        { title: t.nav.createFeature, icon: PlusSquare },
      ],
    },
  ];
}

// Static groups for ALL_ITEMS reference — English only, stable keys for DB storage
const groups: MenuGroup[] = [
  {
    stableKey: "Photographers", title: "Photographers", icon: Camera, defaultOpen: true,
    items: [
      { title: "Projects", icon: Columns, to: "/dashboard/projects" },
      { title: "Dashboard", icon: LayoutDashboard, to: "/dashboard", end: true },
      { title: "Sessions", icon: CalendarDays, to: "/dashboard/sessions", badgeKey: "draftSessions", permKey: "sessions" },
      { title: "Schedule", icon: CalendarCheck2, to: "/dashboard/schedule", permKey: "schedule" },
      { title: "Bookings", icon: BookOpen, to: "/dashboard/bookings", badgeKey: "pendingBookings", permKey: "bookings" },
      { title: "Proof Galleries", icon: ScanEye, to: "/dashboard/galleries?type=proof", permKey: "galleries" },
      { title: "Final Galleries", icon: Images, to: "/dashboard/galleries?type=final", permKey: "galleries" },
      { title: "Personalize", icon: Wand2, to: "/dashboard/personalize" },
    ],
  },
  { stableKey: "Marketing", title: "Marketing", icon: Megaphone, disabled: true, items: [
    { title: "Website", icon: Globe, to: "/dashboard/website", permKey: "website" },
    { title: "Blog", icon: BookText, to: "/dashboard/blog", permKey: "blog" },
    { title: "Creative Studio", icon: Share2, to: "/dashboard/creative", permKey: "creative" },
    { title: "Social Media", icon: Instagram, to: "/dashboard/social-media" },
    { title: "SEO", icon: SearchCheck, to: "/dashboard/seo", permKey: "seo" },
    { title: "Emails", icon: Mail, to: "/dashboard/emails", permKey: "emails" },
    { title: "Push", icon: Bell, to: "/dashboard/push", permKey: "push" },
    { title: "Chat", icon: MessageCircle, to: "/dashboard/chat", permKey: "chat" },
  ]},
  { stableKey: "AI", title: "AI", icon: BrainCircuit, disabled: true, items: [
    { title: "AI Agents", icon: Bot, to: "/dashboard/agents", permKey: "agents" },
    { title: "AI Automations", icon: Zap },
    { title: "Smart Suggestions", icon: Lightbulb },
    { title: "Creative Assistant", icon: Wand2 },
  ]},
  { stableKey: "Finance", title: "Finance", icon: DollarSign, disabled: true, items: [
    { title: "Revenue", icon: TrendingUp, to: "/dashboard/revenue" },
    { title: "Dashboard", icon: LayoutDashboard, to: "/dashboard/finance", end: true },
    { title: "Receivables", icon: ArrowDownCircle, to: "/dashboard/finance/receivables" },
    { title: "Payables", icon: ArrowUpCircle, to: "/dashboard/finance/payables" },
    { title: "Cash Flow", icon: TrendingUp, to: "/dashboard/finance/cashflow" },
    { title: "Reports", icon: BarChart3, to: "/dashboard/finance/reports" },
  ]},
  { stableKey: "CRM", title: "CRM", icon: Users2, disabled: true, items: [
    { title: "Clients", icon: UserCircle, to: "/dashboard/clients", permKey: "clients" },
    { title: "Leads", icon: UserPlus },
  ]},
  { stableKey: "Workflows", title: "Workflows", icon: GitBranch, disabled: true, items: [
    { title: "Kanban", icon: Columns, to: "/dashboard/workflow", permKey: "workflow" },
    { title: "Recurring Workflows", icon: RefreshCw, to: "/dashboard/recurring", permKey: "recurring" },
  ]},
  { stableKey: "Settings", title: "Settings", icon: Settings, items: [
    { title: "My Profile", icon: UserCircle, to: "/dashboard/settings" },
    { title: "Billing", icon: CreditCard, to: "/dashboard/billing" },
    { title: "Access Control", icon: ShieldCheck, to: "/dashboard/access-control" },
    { title: "Help Center", icon: HelpCircle, to: "/dashboard/help" },
  ]},
  { stableKey: "My Features", title: "My Features", icon: Puzzle, disabled: true, items: [
    { title: "Create Feature", icon: PlusSquare },
  ]},
];

groups.forEach((g) => {
  g.items.forEach((item) => {
    ALL_ITEMS.push({ ...item, groupTitle: g.stableKey });
  });
});

function itemKey(groupTitle: string, itemTitle: string) {
  return `${groupTitle}:${itemTitle}`;
}

// ── Sortable favorite row ────────────────────────────────────────────────────
interface SortableFavoriteItemProps {
  id: string;
  item: MenuItem & { groupTitle: string };
  isActive: boolean;
  collapsed: boolean;
  badgeCount?: number;
  onUnpin: () => void;
  unpinLabel: string;
}

function SortableFavoriteItem({ id, item, isActive, collapsed, badgeCount = 0, onUnpin, unpinLabel }: SortableFavoriteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const inner = item.to ? (
    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
      <NavLink
        to={item.to}
        end={item.end}
        className="gap-3 text-xs tracking-wider uppercase font-light hover:bg-sidebar-accent/50"
      >
        <div className="relative shrink-0">
          <item.icon className="h-4 w-4" />
          {collapsed && badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-foreground ring-1 ring-sidebar" />
          )}
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              className="flex-1 truncate"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
            >
              {item.title}
            </motion.span>
          )}
        </AnimatePresence>
        {!collapsed && badgeCount > 0 && (
          <span className="ml-auto shrink-0 bg-foreground text-background text-[10px] font-medium min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-sm">
            {badgeCount}
          </span>
        )}
      </NavLink>
    </SidebarMenuButton>
  ) : (
    <SidebarMenuButton
      disabled
      tooltip={item.title}
      className="gap-3 text-xs tracking-wider uppercase font-light opacity-40 cursor-not-allowed"
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            {item.title}
          </motion.span>
        )}
      </AnimatePresence>
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex items-center group/fav">
            {!collapsed && (
              <button
                {...attributes}
                {...listeners}
                className="shrink-0 px-1 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover/fav:opacity-100 transition-opacity"
                tabIndex={-1}
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex-1 min-w-0">{inner}</div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="text-xs">
          <ContextMenuItem className="gap-2 text-xs cursor-pointer" onClick={onUnpin}>
            <PinOff className="h-3.5 w-3.5" />
            {unpinLabel}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </SidebarMenuItem>
  );
}

// ── Collapsed popover group ──────────────────────────────────────────────────
interface CollapsedGroupPopoverProps {
  group: MenuGroup;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isItemActive: (item: MenuItem) => boolean;
  badges: Record<string, number>;
}

function CollapsedGroupPopover({ group, isOpen, onOpenChange, isItemActive, badges }: CollapsedGroupPopoverProps) {
  const hasActive = group.items.some((item) => isItemActive(item));
  const totalBadge = group.items.reduce((sum, item) => {
    return sum + (item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0);
  }, 0);

  return (
    <SidebarMenuItem>
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <SidebarMenuButton
            tooltip={group.title}
            isActive={hasActive}
            className="gap-3 text-xs tracking-wider uppercase font-light"
          >
            <div className="relative shrink-0">
              <group.icon className="h-4 w-4" />
              {totalBadge > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-foreground ring-1 ring-sidebar" />
              )}
            </div>
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-52 p-1.5"
        >
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60 font-light px-2 pt-1 pb-1.5">
            {group.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const badgeCount = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0;
              if (item.to) {
                return (
                  <NavLink
                    key={item.title}
                    to={item.to}
                    end={item.end}
                    className="flex items-center gap-2.5 px-2 py-1.5 text-xs tracking-wider uppercase font-light rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    activeClassName="text-foreground bg-accent"
                    onClick={() => onOpenChange(false)}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{item.title}</span>
                    {badgeCount > 0 && (
                      <span className="bg-foreground text-background text-[9px] font-medium min-w-[16px] h-4 px-1 flex items-center justify-center rounded-sm">
                        {badgeCount}
                      </span>
                    )}
                  </NavLink>
                );
              }
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-2.5 px-2 py-1.5 text-xs tracking-wider uppercase font-light rounded-sm text-muted-foreground/40 cursor-not-allowed"
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">{item.title}</span>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}

// ── Collapsed favorites popover ──────────────────────────────────────────────
interface CollapsedFavoritesPopoverProps {
  favoriteItems: (MenuItem & { groupTitle: string })[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isItemActive: (item: MenuItem) => boolean;
  badges: Record<string, number>;
  favoritesLabel: string;
  noPinnedLabel: string;
}

function CollapsedFavoritesPopover({ favoriteItems, isOpen, onOpenChange, isItemActive, badges, favoritesLabel, noPinnedLabel }: CollapsedFavoritesPopoverProps) {
  return (
    <SidebarMenuItem>
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <SidebarMenuButton tooltip={favoritesLabel} className="gap-3 text-xs tracking-wider uppercase font-light">
            <Star className="h-4 w-4 shrink-0" />
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className="w-52 p-1.5">
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60 font-light px-2 pt-1 pb-1.5">
            {favoritesLabel}
          </p>
          {favoriteItems.length === 0 ? (
            <p className="px-2 py-2 text-[10px] text-muted-foreground/50 font-light italic">
              {noPinnedLabel}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {favoriteItems.map((item) => {
                const badgeCount = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0;
                if (item.to) {
                  return (
                    <NavLink
                      key={itemKey(item.groupTitle, item.title)}
                      to={item.to}
                      end={item.end}
                      className="flex items-center gap-2.5 px-2 py-1.5 text-xs tracking-wider uppercase font-light rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      activeClassName="text-foreground bg-accent"
                      onClick={() => onOpenChange(false)}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {badgeCount > 0 && (
                        <span className="bg-foreground text-background text-[9px] font-medium min-w-[16px] h-4 px-1 flex items-center justify-center rounded-sm">
                          {badgeCount}
                        </span>
                      )}
                    </NavLink>
                  );
                }
                return (
                  <div
                    key={itemKey(item.groupTitle, item.title)}
                    className="flex items-center gap-2.5 px-2 py-1.5 text-xs tracking-wider uppercase font-light rounded-sm text-muted-foreground/40 cursor-not-allowed"
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{item.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}

// ── Edit Favorites Panel ─────────────────────────────────────────────────────
interface EditFavoritesPanelProps {
  pinnedKeys: string[];
  onToggle: (groupTitle: string, item: MenuItem) => void;
}

function EditFavoritesPanel({ pinnedKeys, onToggle }: EditFavoritesPanelProps) {
  return (
    <div className="max-h-[60vh] overflow-y-auto py-1">
      {groups.map((group) => (
        <div key={group.title} className="mb-2">
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60 font-light px-2 pt-1.5 pb-1">
            {group.title}
          </p>
          {group.items.map((item) => {
            const key = itemKey(group.title, item.title);
            const pinned = pinnedKeys.includes(key);
            return (
              <button
                key={key}
                onClick={() => onToggle(group.title, item)}
                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-xs tracking-wider uppercase font-light rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left truncate">{item.title}</span>
                <Star
                  className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                    pinned
                      ? "fill-foreground text-foreground"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────────────
interface DashboardSidebarProps {
  onSignOut: () => void;
  userEmail?: string | null;
}

export function DashboardSidebar({ onSignOut, userEmail }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const badges = useSidebarBadges();
  const { user } = useAuth();
  const { isOwner, can, loading: permsLoading } = useStudioPermissions();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<{ full_name: string | null; hero_image_url: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Load profile and check admin role in parallel
    supabase
      .from("photographers")
      .select("full_name, hero_image_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data as any); });

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => { setIsAdmin(!!data); });
  }, [user]);

  const translatedGroups = buildGroups(t);

  // Filter a group's items based on permissions
  const filterItems = (items: MenuItem[]): MenuItem[] => {
    if (permsLoading) return items; // show all while loading
    if (isOwner) return items;      // owner sees everything
    return items.filter((item) => !item.permKey || can(item.permKey));
  };

  const [pinnedKeys, setPinnedKeys] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Which group popover is open in collapsed mode
  const [collapsedOpenGroup, setCollapsedOpenGroup] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Load favorites from DB
  useEffect(() => {
    if (!user) return;
    const fetchFavorites = async () => {
      const { data } = await supabase
        .from("sidebar_favorites")
        .select("item_key, position")
        .eq("photographer_id", user.id)
        .order("position", { ascending: true });
      if (data) {
        setPinnedKeys(data.map((r) => r.item_key));
      }
      setLoaded(true);
    };
    fetchFavorites();
  }, [user]);

  // Persist favorites to DB
  const persistFavorites = useCallback(
    async (keys: string[]) => {
      if (!user) return;
      // Delete all then re-insert in order
      await supabase
        .from("sidebar_favorites")
        .delete()
        .eq("photographer_id", user.id);
      if (keys.length > 0) {
        await supabase.from("sidebar_favorites").insert(
          keys.map((key, idx) => ({
            photographer_id: user.id,
            item_key: key,
            position: idx,
          }))
        );
      }
    },
    [user]
  );

  const togglePin = useCallback(
    (groupTitle: string, item: MenuItem) => {
      const key = itemKey(groupTitle, item.title);
      setPinnedKeys((prev) => {
        const next = prev.includes(key)
          ? prev.filter((k) => k !== key)
          : [...prev, key];
        persistFavorites(next);
        return next;
      });
    },
    [persistFavorites]
  );

  const isPinned = (groupTitle: string, itemTitle: string) =>
    pinnedKeys.includes(itemKey(groupTitle, itemTitle));

  // Build a map from stable English key → translated item (matched by URL)
  const keyToTranslated = useMemo<Map<string, MenuItem & { groupTitle: string }>>(() => {
    const map = new Map<string, MenuItem & { groupTitle: string }>();
    translatedGroups.forEach((tg, gi) => {
      const sg = groups[gi];
      tg.items.forEach((tItem, ii) => {
        const sItem = sg?.items[ii];
        if (sItem) {
          map.set(itemKey(sg.stableKey, sItem.title), { ...tItem, groupTitle: sg.stableKey });
        }
      });
    });
    return map;
  }, [translatedGroups]);

  const favoriteItems: (MenuItem & { groupTitle: string })[] = pinnedKeys
    .map((key) => keyToTranslated.get(key) ?? ALL_ITEMS.find((i) => itemKey(i.groupTitle, i.title) === key))
    .filter((i): i is MenuItem & { groupTitle: string } => !!i);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPinnedKeys((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      const next = arrayMove(prev, oldIdx, newIdx);
      persistFavorites(next);
      return next;
    });
  };

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
    const initial: Record<string, boolean> = { Favorites: true };
    groups.forEach((g) => {
      initial[g.stableKey] = g.defaultOpen || groupHasActive(g);
    });
    return initial;
  });

  const toggleGroup = (stableKey: string) => {
    setOpenGroups((prev) => ({ ...prev, [stableKey]: !prev[stableKey] }));
  };

  const renderRegularItem = (item: MenuItem, groupTitle: string) => {
    const pinned = isPinned(groupTitle, item.title);
    const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;

    const content = item.to ? (
      <SidebarMenuButton asChild isActive={isItemActive(item)} tooltip={item.title}>
        <NavLink
          to={item.to}
          end={item.end}
          className="gap-3 text-xs tracking-wider uppercase font-light hover:bg-sidebar-accent/50"
        >
          <div className="relative shrink-0">
            <item.icon className="h-4 w-4" />
            {collapsed && badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-foreground ring-1 ring-sidebar" />
            )}
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="overflow-hidden whitespace-nowrap flex-1"
              >
                {item.title}
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && badgeCount > 0 && (
            <span className="ml-auto shrink-0 bg-foreground text-background text-[10px] font-medium min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-sm">
              {badgeCount}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    ) : (
      <SidebarMenuButton
        disabled
        tooltip={item.title}
        className="gap-3 text-xs tracking-wider uppercase font-light opacity-40 cursor-not-allowed"
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="overflow-hidden whitespace-nowrap"
            >
              {item.title}
            </motion.span>
          )}
        </AnimatePresence>
      </SidebarMenuButton>
    );

    return (
      <SidebarMenuItem key={`${groupTitle}:${item.title}`}>
        <ContextMenu>
          <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
          <ContextMenuContent className="text-xs">
            <ContextMenuItem
              className="gap-2 text-xs cursor-pointer"
              onClick={() => togglePin(groupTitle, item)}
            >
              {pinned ? (
                <><PinOff className="h-3.5 w-3.5" />{t.nav.unpinFromFavorites}</>
              ) : (
                <><Pin className="h-3.5 w-3.5" />{t.nav.pinToFavorites}</>
              )}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </SidebarMenuItem>
    );
  };

  const badgesAsRecord = badges as unknown as Record<string, number>;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* ── Logo header ── */}
      <SidebarHeader className="flex items-center justify-center border-b border-sidebar-border py-4 px-3 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {collapsed ? (
            <motion.img
              key="selo"
              src={seloPreto}
              alt="Davions"
              className="h-7 w-7 object-contain"
              initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.7, rotate: -10 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            />
          ) : (
            <motion.img
              key="logo"
              src={logoPrincipal}
              alt="Davions"
              className="h-7 object-contain"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>
      </SidebarHeader>

      <SidebarContent>
        {/* ── COLLAPSED MODE: icon-only popovers ── */}
        {collapsed ? (
          <>
            {/* Favorites popover */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <CollapsedFavoritesPopover
                    favoriteItems={favoriteItems}
                    isOpen={collapsedOpenGroup === "Favorites"}
                    onOpenChange={(open) => setCollapsedOpenGroup(open ? "Favorites" : null)}
                    isItemActive={isItemActive}
                    badges={badgesAsRecord}
                    favoritesLabel={t.nav.favorites}
                    noPinnedLabel={t.nav.noPinnedItems}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Group popovers */}
            {translatedGroups.map((group) => {
              if (group.disabled && !isAdmin) return null;
              const visibleItems = filterItems(group.items);
              if (visibleItems.length === 0) return null;
              return (
              <SidebarGroup key={group.stableKey}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <CollapsedGroupPopover
                      group={{ ...group, items: visibleItems }}
                      isOpen={collapsedOpenGroup === group.stableKey}
                      onOpenChange={(open) => setCollapsedOpenGroup(open ? group.stableKey : null)}
                      isItemActive={isItemActive}
                      badges={badgesAsRecord}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              );
            })}
          </>
        ) : (
          /* ── EXPANDED MODE: collapsible groups ── */
          <>
            {/* Favorites group */}
            <Collapsible
              open={openGroups["Favorites"]}
              onOpenChange={() => toggleGroup("Favorites")}
            >
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-light hover:text-foreground transition-colors">
                    <Star className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-left">{t.nav.favorites}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditMode((prev) => !prev);
                        // Ensure favorites group is open when entering edit mode
                        if (!openGroups["Favorites"]) {
                          setOpenGroups((prev) => ({ ...prev, Favorites: true }));
                        }
                      }}
                      className="shrink-0 p-0.5 rounded-sm text-muted-foreground/50 hover:text-foreground transition-colors"
                      aria-label={editMode ? "Done editing favorites" : "Edit favorites"}
                    >
                      {editMode ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Pencil className="h-3 w-3" />
                      )}
                    </button>
                    <ChevronRight
                      className="h-3 w-3 shrink-0 transition-transform duration-200"
                      style={{ transform: openGroups["Favorites"] ? "rotate(90deg)" : "rotate(0deg)" }}
                    />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>

                <CollapsibleContent>
                  <SidebarGroupContent>
                    {editMode ? (
                      <div className="pl-3">
                        <EditFavoritesPanel
                          pinnedKeys={pinnedKeys}
                          onToggle={togglePin}
                        />
                      </div>
                    ) : (
                      <SidebarMenu className="pl-3">
                        {favoriteItems.length === 0 ? (
                          <p className="px-2 py-1.5 text-[10px] text-muted-foreground/50 font-light italic">
                            {t.nav.pinHint}
                          </p>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={pinnedKeys}
                              strategy={verticalListSortingStrategy}
                            >
                              {favoriteItems.map((item) => (
                                 <SortableFavoriteItem
                                  key={itemKey(item.groupTitle, item.title)}
                                  id={itemKey(item.groupTitle, item.title)}
                                  item={item}
                                  isActive={isItemActive(item)}
                                  collapsed={false}
                                  badgeCount={item.badgeKey ? badges[item.badgeKey] : 0}
                                  onUnpin={() => togglePin(item.groupTitle, item)}
                                  unpinLabel={t.nav.unpinFromFavorites}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        )}
                      </SidebarMenu>
                    )}
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Regular groups */}
            {translatedGroups.map((group) => {
              if (group.disabled && !isAdmin) return null;
              const visibleItems = filterItems(group.items);
              if (visibleItems.length === 0) return null;
              return (
              <Collapsible
                key={group.stableKey}
                open={openGroups[group.stableKey]}
                onOpenChange={() => toggleGroup(group.stableKey)}
              >
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="flex w-full items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-light hover:text-foreground transition-colors">
                      <group.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left">{group.title}</span>
                      <ChevronRight
                        className="h-3 w-3 shrink-0 transition-transform duration-200"
                        style={{ transform: openGroups[group.stableKey] ? "rotate(90deg)" : "rotate(0deg)" }}
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>

                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu className="pl-3">
                        {visibleItems.map((item) => renderRegularItem(item, group.stableKey))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
              );
            })}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              className="flex items-center gap-2.5 px-2 mb-2 cursor-pointer rounded-md hover:bg-sidebar-accent transition-colors"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              onClick={() => navigate("/dashboard/settings")}
            >
              {/* Avatar */}
              <div className="h-7 w-7 rounded-full overflow-hidden shrink-0 border border-sidebar-border bg-muted flex items-center justify-center">
                {profile?.hero_image_url ? (
                  <img src={profile.hero_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground uppercase select-none">
                    {(profile?.full_name || userEmail || "?").charAt(0)}
                  </span>
                )}
              </div>
              {/* Name + email */}
              <div className="flex flex-col min-w-0">
                {profile?.full_name && (
                  <span className="text-[11px] font-light text-foreground truncate leading-tight">
                    {profile.full_name}
                  </span>
                )}
                {userEmail && (
                  <span className="text-[9px] text-muted-foreground truncate leading-tight tracking-wide">
                    {userEmail}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Collapsed: show avatar only */}
        {collapsed && (
          <div className="flex justify-center mb-2 cursor-pointer" onClick={() => navigate("/dashboard/settings")}>
            <div className="h-7 w-7 rounded-full overflow-hidden border border-sidebar-border bg-muted flex items-center justify-center hover:opacity-80 transition-opacity">
              {profile?.hero_image_url ? (
                <img src={profile.hero_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] font-medium text-muted-foreground uppercase select-none">
                  {(profile?.full_name || userEmail || "?").charAt(0)}
                </span>
              )}
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onSignOut}
              tooltip="Sign out"
              className="gap-3 text-xs tracking-wider uppercase font-light text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {t.nav.signOut}
                  </motion.span>
                )}
              </AnimatePresence>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
