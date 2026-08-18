import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell, MailOpen, MessageSquare, Send } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listNotifications, markNotificationsRead } from "@/lib/daily.functions";
import { listMyThreads } from "@/lib/support.functions";
import { useAuth } from "@/hooks/useAuth";
import { offlineFirst } from "@/lib/offline/offline-first";
import { INBOX_CHANGED_EVENT, type InboxSnapshot } from "@/lib/inbox-sync";

type Notification = Awaited<ReturnType<typeof listNotifications>>["notifications"][number];
type Thread = Awaited<ReturnType<typeof listMyThreads>>["threads"][number];

type Item = {
  id: string;
  kind: "update" | "message";
  title: string;
  body: string | null;
  unread: boolean;
  at: string;
};

export function NotificationBell() {
  const load = useServerFn(listNotifications);
  const loadThreads = useServerFn(listMyThreads);
  const markRead = useServerFn(markNotificationsRead);
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [updatesUnread, setUpdatesUnread] = useState(0);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const unread = updatesUnread + messagesUnread;

  useEffect(() => {
    let active = true;
    const fetchAll = () => {
      void Promise.all([
        offlineFirst("inbox:notifications", () => load({}), user?.id),
        offlineFirst("inbox:threads", () => loadThreads({}), user?.id),
      ]).then(([notif, support]) => {
        if (!active) return;
        setUpdatesUnread(notif.unread);
        setMessagesUnread(support.threads.filter((t) => t.user_unread).length);
        const merged: Item[] = [
          ...notif.notifications.map((n) => ({
            id: n.id,
            kind: "update" as const,
            title: n.title,
            body: n.body,
            unread: !n.read_at,
            at: n.created_at,
          })),
          ...support.threads.map((t) => ({
            id: t.id,
            kind: "message" as const,
            title: t.subject,
            body: t.messages?.[t.messages.length - 1]?.body ?? null,
            unread: t.user_unread,
            at: t.last_message_at,
          })),
        ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        setItems(merged);
      }).catch(() => undefined);
    };
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<Partial<InboxSnapshot>>).detail;
      if (typeof detail?.updatesUnread === "number") setUpdatesUnread(detail.updatesUnread);
      if (typeof detail?.messagesUnread === "number") setMessagesUnread(detail.messagesUnread);
      if (navigator.onLine) fetchAll();
    };
    fetchAll();
    window.addEventListener(INBOX_CHANGED_EVENT, onChanged);
    window.addEventListener("online", fetchAll);
    window.addEventListener("focus", fetchAll);
    const t = setInterval(fetchAll, 30_000);
    return () => {
      active = false;
      window.removeEventListener(INBOX_CHANGED_EVENT, onChanged);
      window.removeEventListener("online", fetchAll);
      window.removeEventListener("focus", fetchAll);
      clearInterval(t);
    };
  }, [load, loadThreads, user?.id]);

  function markAllRead() {
    setUpdatesUnread(0);
    setItems((prev) => prev.map((n) => (n.kind === "update" ? { ...n, unread: false } : n)));
    void markRead({}).catch(() => undefined);
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && window.dispatchEvent(new Event(INBOX_CHANGED_EVENT))}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Inbox (${unread} unread)` : "Inbox"}
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
      <DropdownMenuContent align="end" className="w-[20rem]">
        <DropdownMenuLabel className="flex items-center gap-2">
          <span className="flex-1">Inbox</span>
          {updatesUnread > 0 && (
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
            Nothing yet. Your morning message and our replies land here.
          </p>
        ) : (
          items.slice(0, 6).map((n) => (
            <DropdownMenuItem key={`${n.kind}-${n.id}`} asChild className="whitespace-normal">
              <Link
                to="/inbox"
                search={{ tab: n.kind === "message" ? ("messages" as const) : ("updates" as const), compose: false }}
              >
                <span className="block">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {n.unread && <span className="text-primary">•</span>}
                    {n.kind === "message" ? (
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <Bell className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{n.title}</span>
                  </span>
                  {n.body ? (
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                  ) : null}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to="/inbox"
            search={{ tab: "updates" as const, compose: false }}
            className="justify-center text-sm font-bold text-primary"
          >
            Open inbox
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/inbox"
            search={{ tab: "messages" as const, compose: true }}
            className="justify-center gap-2 text-sm font-bold text-primary"
          >
            <Send className="h-3.5 w-3.5" /> Contact the team
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
