import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  PenLine,
  Lightbulb,
  Zap,
  FileText,
  Search,
  Library,
  Settings,
} from "lucide-react";

const BASE = "/dashboard/blog";

const NAV_ITEMS = [
  {
    group: "Visão",
    items: [{ label: "Dashboard", path: `${BASE}`, icon: LayoutDashboard }],
  },
  {
    group: "Criar",
    items: [
      { label: "Manual", path: `${BASE}/manual`, icon: PenLine },
      { label: "Gerar Temas", path: `${BASE}/temas`, icon: Lightbulb },
      { label: "Gerar Blog", path: `${BASE}/gerador`, icon: Zap },
    ],
  },
  {
    group: "Conteúdo",
    items: [
      { label: "Publicados", path: `${BASE}/publicados`, icon: FileText },
      { label: "SEO", path: `${BASE}/seo`, icon: Search },
      { label: "Banco de Temas", path: `${BASE}/banco-temas`, icon: Library },
    ],
  },
  {
    group: "Config",
    items: [{ label: "Configurações", path: `${BASE}/config`, icon: Settings }],
  },
];

export const BlogCarouselNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  const slide = (dir: number) => {
    setOffset((prev) => prev + dir * 140);
  };

  return (
    <div className="h-11 flex items-center bg-background border-b shrink-0 px-1 gap-1">
      <button
        onClick={() => slide(1)}
        className="w-7 h-7 flex items-center justify-center rounded-md border bg-muted shrink-0"
      >
        <ChevronLeft size={14} />
      </button>
      <div className="overflow-hidden flex-1">
        <div
          ref={trackRef}
          className="flex items-center gap-1 transition-transform duration-250 ease-in-out"
          style={{ transform: `translateX(${offset}px)` }}
        >
          {NAV_ITEMS.map((group, gi) => (
            <div key={group.group} className="flex items-center gap-1 shrink-0">
              {gi > 0 && <div className="w-px h-5 bg-border mx-2 shrink-0" />}
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 shrink-0">
                {group.group}
              </span>
              {group.items.map((item) => {
                const active =
                  item.path === BASE
                    ? location.pathname === BASE || location.pathname === BASE + "/"
                    : location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium shrink-0 transition-colors ${
                      active
                        ? "bg-background text-foreground border border-border shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => slide(-1)}
        className="w-7 h-7 flex items-center justify-center rounded-md border bg-muted shrink-0"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
};
