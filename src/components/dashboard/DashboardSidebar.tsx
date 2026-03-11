import { useState, useCallback } from "react";
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
      { title: "Schedule", icon: CalendarCheck2, to: "/dashboard/schedule" },
      { title: "Bookings", icon: BookOpen, to: "/dashboard/bookings", badgeKey: "pendingBookings" },
      { title: "Proof Galleries", icon: ScanEye, to: "/dashboard/galleries?type=proof" },
      { title: "Final Galleries", icon: Images, to: "/dashboard/galleries?type=final" },
      { title: "Personalize", icon: Wand2, to: "/dashboard/personalize" },
    ],
  },
  {
    title: "Marketing",
    icon: Megaphone,
    items: [
      { title: "Website", icon: Globe },
      { title: "Blog", icon: BookText, to: "/dashboard/blog" },
      { title: "Creative Studio", icon: Share2, to: "/dashboard/creative" },
      { title: "SEO", icon: SearchCheck, to: "/dashboard/seo" },
      { title: "Emails", icon: Mail, to: "/dashboard/emails" },
      { title: "Push", icon: Bell, to: "/dashboard/push" },
      { title: "Chat", icon: MessageCircle, to: "/dashboard/chat" },
    ],
  },
  {
    title: "AI",
    icon: BrainCircuit,
    items: [
      { title: "AI Agents", icon: Bot, to: "/dashboard/agents" },
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
      { title: "Clients", icon: UserCircle, to: "/dashboard/clients" },
      { title: "Leads", icon: UserPlus },
    ],
  },
  {
    title: "Workflows",
    icon: GitBranch,
    items: [
      { title: "Kanban", icon: Columns, to: "/dashboard/workflow" },
      { title: "Recurring Workflows", icon: RefreshCw, to: "/dashboard/recurring" },
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
  badgeCount?: number;
  onUnpin: () => void;
}

function SortableFavoriteItem({ id, item, isActive, collapsed, badgeCount = 0, onUnpin }: SortableFavoriteItemProps) {
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
            Unpin from Favorites
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
}

function CollapsedFavoritesPopover({ favoriteItems, isOpen, onOpenChange, isItemActive, badges }: CollapsedFavoritesPopoverProps) {
  return (
    <SidebarMenuItem>
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <SidebarMenuButton tooltip="Favorites" className="gap-3 text-xs tracking-wider uppercase font-light">
            <Star className="h-4 w-4 shrink-0" />
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className="w-52 p-1.5">
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground/60 font-light px-2 pt-1 pb-1.5">
            Favorites
          </p>
          {favoriteItems.length === 0 ? (
            <p className="px-2 py-2 text-[10px] text-muted-foreground/50 font-light italic">
              No pinned items
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
  // Which group popover is open in collapsed mode
  const [collapsedOpenGroup, setCollapsedOpenGroup] = useState<string | null>(null);

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
                <><PinOff className="h-3.5 w-3.5" />Unpin from Favorites</>
              ) : (
                <><Pin className="h-3.5 w-3.5" />Pin to Favorites</>
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
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Group popovers */}
            {groups.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <CollapsedGroupPopover
                      group={group}
                      isOpen={collapsedOpenGroup === group.title}
                      onOpenChange={(open) => setCollapsedOpenGroup(open ? group.title : null)}
                      isItemActive={isItemActive}
                      badges={badgesAsRecord}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
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
                    <span className="flex-1 text-left">Favorites</span>
                    <ChevronRight
                      className="h-3 w-3 shrink-0 transition-transform duration-200"
                      style={{ transform: openGroups["Favorites"] ? "rotate(90deg)" : "rotate(0deg)" }}
                    />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>

                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu className="pl-3">
                      {favoriteItems.length === 0 ? (
                        <p className="px-2 py-1.5 text-[10px] text-muted-foreground/50 font-light italic">
                          Right-click any item to pin it here
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

            {/* Regular groups */}
            {groups.map((group) => (
              <Collapsible
                key={group.title}
                open={openGroups[group.title]}
                onOpenChange={() => toggleGroup(group.title)}
              >
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="flex w-full items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-light hover:text-foreground transition-colors">
                      <group.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left">{group.title}</span>
                      <ChevronRight
                        className="h-3 w-3 shrink-0 transition-transform duration-200"
                        style={{ transform: openGroups[group.title] ? "rotate(90deg)" : "rotate(0deg)" }}
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>

                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu className="pl-3">
                        {group.items.map((item) => renderRegularItem(item, group.title))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            ))}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <AnimatePresence initial={false}>
          {!collapsed && userEmail && (
            <motion.p
              className="text-[10px] text-muted-foreground truncate mb-2 px-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
            >
              {userEmail}
            </motion.p>
          )}
        </AnimatePresence>
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
                    Sign Out
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
