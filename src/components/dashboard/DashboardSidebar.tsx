import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  LogOut,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import seloPreto from "@/assets/selo_preto.png";

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

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Sessions", url: "/dashboard/sessions", icon: CalendarDays },
  { title: "Bookings", url: "/dashboard/bookings", icon: BookOpen },
  { title: "Galleries", url: "/dashboard/galleries", icon: FolderOpen },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

interface DashboardSidebarProps {
  onSignOut: () => void;
  userEmail?: string | null;
}

export function DashboardSidebar({ onSignOut, userEmail }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) =>
    path === "/dashboard"
      ? currentPath === "/dashboard"
      : currentPath.startsWith(path);

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

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] tracking-[0.3em] uppercase font-light">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="gap-3 text-xs tracking-wider uppercase font-light hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-normal"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
