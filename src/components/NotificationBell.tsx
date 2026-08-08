import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell, MailOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listNotifications, markNotificationsRead } from "@/lib/daily.functions";

type Notification = Awaited<ReturnType<typeof listNotifications>>["notifications"][number];

export function NotificationBell() {
  const load = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationsRead);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchAll = () => {
      void load({})
        .then((res) => {
          if (!active) return;
          setItems(res.notifications);
          setUnread(res.unread);
        })
        .catch(() => undefined);
    };
    fetchAll();
    const t = setInterval(fetchAll, 120_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [load]);

  function markAllRead() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    void markRead({}).catch(() => undefined);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary text-primary hover:bg-primary/10"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[19rem]">
        <DropdownMenuLabel className="flex items-center gap-2">
          <span className="flex-1">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/10"
            >
              <MailOpen className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nothing yet. Your morning message lands here.
          </p>
        ) : (
          items.slice(0, 5).map((n) => (
            <DropdownMenuItem key={n.id} asChild className="whitespace-normal">
              <Link to="/notifications">
                <span className="block">
                  <span className="block text-sm font-semibold">
                    {!n.read_at && <span className="mr-1 text-primary">•</span>}
                    {n.title}
                  </span>
                  {n.body ? (
                    <span className="block line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                  ) : null}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notifications" className="justify-center text-sm font-bold text-primary">
            See all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
