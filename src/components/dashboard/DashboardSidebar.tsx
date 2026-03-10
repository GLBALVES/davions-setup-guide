import { useState, useCallback } from "react";
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
  Pin,
  PinOff,
  GripVertical,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  SidebarMenuBadge,
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
import logoPrincipal from "@/assets/logo_principal_preto.png";
import seloPreto from "@/assets/selo_preto.png";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";

type MenuItem = {
  title: string;
  icon: React.ElementType;
  to?: string;
  end?: boolean;
  badgeKey?: "pendingBookings" | "draftSessions";
};

type MenuGroup = {
  title: string;
  icon: React.ElementType;
  items: MenuItem[];
  defaultOpen?: boolean;
};

const ALL_ITEMS: (MenuItem & { groupTitle: string })[] = [];

const groups: MenuGroup[] = [
  {
    title: "Photographers",
    icon: Camera,
    defaultOpen: true,
    items: [
      { title: "Dashboard", icon: LayoutDashboard, to: "/dashboard", end: true },
      { title: "Sessions", icon: CalendarDays, to: "/dashboard/sessions", badgeKey: "draftSessions" },
      { title: "Bookings", icon: BookOpen, to: "/dashboard/bookings", badgeKey: "pendingBookings" },
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

groups.forEach((g) => {
  g.items.forEach((item) => {
    ALL_ITEMS.push({ ...item, groupTitle: g.title });
  });
});

const FAVORITES_KEY = "davions_sidebar_favorites";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(keys: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(keys));
}

function itemKey(groupTitle: string, itemTitle: string) {
  return `${groupTitle}:${itemTitle}`;
}

// ── Sortable favorite row ────────────────────────────────────────────────────
interface SortableFavoriteItemProps {
  id: string;
  item: MenuItem & { groupTitle: string };
  isActive: boolean;
  collapsed: boolean;
  onUnpin: () => void;
}

function SortableFavoriteItem({ id, item, isActive, collapsed, onUnpin }: SortableFavoriteItemProps) {
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
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
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
            Unpin from Favorites
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </SidebarMenuItem>
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
  const badges = useSidebarBadges();

  const [pinnedKeys, setPinnedKeys] = useState<string[]>(loadFavorites);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const togglePin = useCallback((groupTitle: string, item: MenuItem) => {
    const key = itemKey(groupTitle, item.title);
    setPinnedKeys((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isPinned = (groupTitle: string, itemTitle: string) =>
    pinnedKeys.includes(itemKey(groupTitle, itemTitle));

  const favoriteItems: (MenuItem & { groupTitle: string })[] = pinnedKeys
    .map((key) => ALL_ITEMS.find((i) => itemKey(i.groupTitle, i.title) === key))
    .filter((i): i is MenuItem & { groupTitle: string } => !!i);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPinnedKeys((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      const next = arrayMove(prev, oldIdx, newIdx);
      saveFavorites(next);
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
      initial[g.title] = g.defaultOpen || groupHasActive(g);
    });
    return initial;
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
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
                <><PinOff className="h-3.5 w-3.5" />Unpin from Favorites</>
              ) : (
                <><Pin className="h-3.5 w-3.5" />Pin to Favorites</>
              )}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {badgeCount > 0 && (
          <SidebarMenuBadge className="bg-foreground text-background text-[10px] font-medium min-w-[18px] h-[18px] px-1">
            {badgeCount}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* ── Logo header ── */}
      <SidebarHeader className="flex items-center justify-center border-b border-sidebar-border py-4 px-3">
        {collapsed ? (
          <img
            src={seloPreto}
            alt="Davions"
            className="h-7 w-7 object-contain"
          />
        ) : (
          <img
            src={logoPrincipal}
            alt="Davions"
            className="h-7 object-contain"
          />
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* ── Favorites group (drag-and-drop) ── */}
        <Collapsible
          open={collapsed ? true : openGroups["Favorites"]}
          onOpenChange={() => !collapsed && toggleGroup("Favorites")}
        >
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-light hover:text-foreground transition-colors">
                <Star className="h-3.5 w-3.5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Favorites</span>
                    <ChevronRight
                      className="h-3 w-3 shrink-0 transition-transform duration-200"
                      style={{ transform: openGroups["Favorites"] ? "rotate(90deg)" : "rotate(0deg)" }}
                    />
                  </>
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>

            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className={collapsed ? "" : "pl-3"}>
                  {favoriteItems.length === 0 ? (
                    !collapsed && (
                      <p className="px-2 py-1.5 text-[10px] text-muted-foreground/50 font-light italic">
                        Right-click any item to pin it here
                      </p>
                    )
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
                            collapsed={collapsed}
                            onUnpin={() => togglePin(item.groupTitle, item)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* ── Regular groups ── */}
        {groups.map((group) => (
          <Collapsible
            key={group.title}
            open={collapsed ? true : openGroups[group.title]}
            onOpenChange={() => !collapsed && toggleGroup(group.title)}
          >
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-light hover:text-foreground transition-colors">
                  <group.icon className="h-3.5 w-3.5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{group.title}</span>
                      <ChevronRight
                        className="h-3 w-3 shrink-0 transition-transform duration-200"
                        style={{ transform: openGroups[group.title] ? "rotate(90deg)" : "rotate(0deg)" }}
                      />
                    </>
                  )}
                </CollapsibleTrigger>
              </SidebarGroupLabel>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu className={collapsed ? "" : "pl-3"}>
                    {group.items.map((item) => renderRegularItem(item, group.title))}
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
