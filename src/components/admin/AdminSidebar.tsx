import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Bug, ArrowLeft, Shield, Sparkles, Globe, Server, Mail, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import logoPrincipal from "@/assets/logo_principal_preto.png";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Studios", icon: Users },
  { to: "/admin/bugs", label: "Bug Reports", icon: Bug },
  { to: "/admin/help-assistant", label: "Help Assistant", icon: Sparkles },
  { to: "/admin/domains", label: "Domains", icon: Globe },
  { to: "/admin/vps", label: "VPS", icon: Server },
  { to: "/admin/email", label: "Email", icon: Mail },
  { to: "/admin/approvals", label: "Approvals", icon: UserCheck },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  return (
    <aside className="w-56 shrink-0 h-screen border-r border-border flex flex-col bg-background sticky top-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border gap-2.5">
        <Shield size={13} className="text-muted-foreground shrink-0" />
        <span className="text-[10px] tracking-[0.3em] uppercase font-light text-foreground/70">Admin Panel</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors duration-150",
                "font-light tracking-wide",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )
            }
          >
            <Icon size={13} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Back */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 font-light"
        >
          <ArrowLeft size={13} />
          Back to Dashboard
        </button>
      </div>
    </aside>
  );
}
