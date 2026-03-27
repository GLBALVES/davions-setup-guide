import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToPush,
  type NotificationRow,
} from "@/lib/notifications-api";
import { formatDistanceToNow } from "date-fns";
import { enUS, ptBR, es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const dateFnsLocale = { en: enUS, pt: ptBR, es: es };

const eventIcons: Record<string, string> = {
  new_booking: "📅",
  payment_received: "💰",
  payment_failed: "❌",
  new_chat_message: "💬",
  new_bug_report: "🐛",
  general: "🔔",
};

export function NotificationBell() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const n = t.notif;
  const photographerId = user?.id || "";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!photographerId) return;
    const [notifs, count] = await Promise.all([
      fetchNotifications(photographerId),
      fetchUnreadCount(photographerId),
    ]);
    setItems(notifs);
    setUnread(count);
  }, [photographerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!photographerId) return;
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `photographer_id=eq.${photographerId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationRow;
          setItems((prev) => [newNotif, ...prev].slice(0, 30));
          setUnread((c) => c + 1);

          // Browser notification if permission granted
          if (Notification.permission === "granted") {
            new Notification(newNotif.title, { body: newNotif.body, icon: "/placeholder.svg" });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [photographerId]);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    setUnread((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead(photographerId);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnread(0);
  };

  const requestBrowserPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) requestBrowserPermission(); }}>
      <PopoverTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 relative">
              <Bell size={15} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-none">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{n.title}</TooltipContent>
        </Tooltip>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{n.title}</h3>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleMarkAllRead}>
              <CheckCheck className="h-3 w-3" /> {n.markAllRead}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{n.empty}</div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => !item.read && handleMarkRead(item.id)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors ${
                    !item.read ? "bg-primary/5" : ""
                  }`}
                >
                  <span className="text-lg mt-0.5">{eventIcons[item.event] || eventIcons.general}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!item.read ? "font-medium" : "text-muted-foreground"}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                        locale: dateFnsLocale[lang] || enUS,
                      })}
                    </p>
                  </div>
                  {!item.read && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
