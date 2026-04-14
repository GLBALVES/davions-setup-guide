import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, DollarSign, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export interface PickerSession {
  id: string;
  title: string;
  price: number;
  duration_minutes: number;
  cover_image_url: string | null;
  session_type_name: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: PickerSession[];
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

export function SessionPickerModal({
  open, onOpenChange, sessions, currentSessionId, onSelect,
}: Props) {
  const { t } = useLanguage();
  const tp = t.projects;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Unique session types for filter
  const sessionTypes = useMemo(() => {
    const types = new Set<string>();
    sessions.forEach((s) => { if (s.session_type_name) types.add(s.session_type_name); });
    return Array.from(types).sort();
  }, [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || s.session_type_name === typeFilter;
      return matchSearch && matchType;
    });
  }, [sessions, search, typeFilter]);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full p-0 flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
        <DialogHeader className="p-4 pb-3 border-b border-border/50 shrink-0">
          <DialogTitle className="font-light tracking-wide text-base">
            {tp.changeSession}
          </DialogTitle>

          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tp.searchSessionsPlaceholder || "Search sessions…"}
                className="h-8 text-xs pl-8"
              />
            </div>

            {/* Type filter */}
            {sessionTypes.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={cn(
                    "px-2 py-1 rounded-md text-[10px] tracking-wider uppercase border transition-colors",
                    typeFilter === "all"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                  )}
                >
                  {tp.allTypes || "All"}
                </button>
                {sessionTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] tracking-wider uppercase border transition-colors",
                      typeFilter === type
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 italic">
              {tp.noSessionsFound || "No sessions found"}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((session) => {
                const isCurrent = session.id === currentSessionId;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      if (!isCurrent) {
                        onSelect(session.id);
                        onOpenChange(false);
                      }
                    }}
                    className={cn(
                      "relative flex flex-col rounded-lg border overflow-hidden text-left transition-all hover:shadow-md group",
                      isCurrent
                        ? "border-foreground/60 ring-1 ring-foreground/20"
                        : "border-border hover:border-foreground/30"
                    )}
                  >
                    {/* Cover image */}
                    <div className="relative w-full aspect-[4/3] bg-muted/40 overflow-hidden">
                      {session.cover_image_url ? (
                        <img
                          src={session.cover_image_url}
                          alt={session.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <DollarSign className="h-8 w-8" />
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute top-2 right-2 bg-foreground text-background rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      {session.session_type_name && (
                        <Badge variant="secondary" className="absolute bottom-2 left-2 text-[9px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm">
                          {session.session_type_name}
                        </Badge>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2.5 flex flex-col gap-1">
                      <p className="text-xs font-medium truncate leading-tight">{session.title}</p>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold tabular-nums">{fmt(session.price)}</span>
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {session.duration_minutes}min
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
