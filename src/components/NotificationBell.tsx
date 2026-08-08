import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
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

  function onOpenChange(open: boolean) {
    if (!open || !unread) return;
    setUnread(0);
    void markRead({}).catch(() => undefined);
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
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
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Smarty Coach</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nothing yet. Your morning message lands here.
          </p>
        ) : (
          items.slice(0, 8).map((n) => (
            <DropdownMenuItem key={n.id} asChild className="whitespace-normal">
              {n.workout_id ? (
                <Link to="/workout/$workoutId" params={{ workoutId: n.workout_id }}>
                  <span className="block">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    {n.body ? (
                      <span className="block text-xs text-muted-foreground">{n.body}</span>
                    ) : null}
                  </span>
                </Link>
              ) : (
                <div>
                  <span className="block text-sm font-semibold">{n.title}</span>
                  {n.body ? (
                    <span className="block text-xs text-muted-foreground">{n.body}</span>
                  ) : null}
                </div>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
