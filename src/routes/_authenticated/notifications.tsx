import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, Loader2, Mail, MailOpen, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteNotifications,
  listNotifications,
  setNotificationsRead,
} from "@/lib/daily.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Smarty Workout" },
      {
        name: "description",
        content: "Read, mark and delete the messages Smarty Coach sends you.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

type Notification = Awaited<ReturnType<typeof listNotifications>>["notifications"][number];

function when(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 1) return "just now";
  if (diff < 60) return `${Math.round(diff)} min ago`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)} h ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function NotificationsPage() {
  const load = useServerFn(listNotifications);
  const setRead = useServerFn(setNotificationsRead);
  const removeMany = useServerFn(deleteNotifications);

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string[] | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await load({});
      setItems(res.notifications);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(
    () => items.filter((n) => (unreadOnly ? !n.read_at : true)),
    [items, unreadOnly],
  );
  const visibleIds = useMemo(() => visible.map((n) => n.id), [visible]);
  const picked = useMemo(() => visibleIds.filter((id) => selected.has(id)), [visibleIds, selected]);
  const allPicked = visibleIds.length > 0 && picked.length === visibleIds.length;
  const unread = items.filter((n) => !n.read_at).length;

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allPicked ? new Set() : new Set(visibleIds));

  async function bulkRead(read: boolean, ids = picked) {
    if (!ids.length) return;
    setItems((prev) =>
      prev.map((n) =>
        ids.includes(n.id) ? { ...n, read_at: read ? new Date().toISOString() : null } : n,
      ),
    );
    setSelected(new Set());
    await setRead({ data: { ids, read } }).catch(() => undefined);
    toast.success(`${ids.length} marked as ${read ? "read" : "unread"}`);
  }

  async function doDelete() {
    const ids = confirm ?? [];
    setConfirm(null);
    if (!ids.length) return;
    setItems((prev) => prev.filter((n) => !ids.includes(n.id)));
    setSelected(new Set());
    if (openId && ids.includes(openId)) setOpenId(null);
    await removeMany({ data: { ids } }).catch(() => undefined);
    toast.success(`${ids.length} message${ids.length === 1 ? "" : "s"} deleted`);
  }

  function openMessage(n: Notification) {
    setOpenId((cur) => (cur === n.id ? null : n.id));
    if (!n.read_at) void bulkRead(true, [n.id]);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-5 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Inbox
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Notifications</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything Smarty Coach sends you. Tap a message to read it, select to delete.
        </p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setUnreadOnly(false)}
          className={`flex h-10 items-center justify-center rounded-2xl text-sm font-bold ${
            unreadOnly ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
          }`}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setUnreadOnly(true)}
          className={`flex h-10 items-center justify-center rounded-2xl text-sm font-bold ${
            unreadOnly ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          Unread ({unread})
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background p-2">
        <div
          className={`flex h-9 shrink-0 items-center gap-2 rounded-xl px-2 text-xs font-bold ${
            visibleIds.length ? "" : "pointer-events-none opacity-40"
          }`}
        >
          <Checkbox
            checked={allPicked}
            onCheckedChange={toggleAll}
            aria-label="Select all"
            disabled={!visibleIds.length}
          />
          <button type="button" onClick={toggleAll} className="whitespace-nowrap">
            {picked.length ? `${picked.length} selected` : "Select all"}
          </button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={!picked.length}
            onClick={() => bulkRead(true)}
            aria-label="Mark selected as read"
            className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground disabled:opacity-40"
          >
            <MailOpen className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!picked.length}
            onClick={() => bulkRead(false)}
            aria-label="Mark selected as unread"
            className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground disabled:opacity-40"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!picked.length}
            onClick={() => setConfirm(picked)}
            aria-label="Delete selected"
            className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {picked.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
              className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
          Nothing here yet. Your morning message and workout alerts land here.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((n) => {
            const isPicked = selected.has(n.id);
            const isOpen = openId === n.id;
            return (
              <li
                key={n.id}
                className={`rounded-2xl border p-3 transition ${
                  isPicked
                    ? "border-primary bg-primary/10"
                    : !n.read_at
                      ? "border-primary/40 bg-primary/[0.04]"
                      : "border-border bg-background"
                }`}
              >
                <div className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center">
                    <Checkbox
                      checked={isPicked}
                      onCheckedChange={() => toggleOne(n.id)}
                      aria-label="Select message"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => openMessage(n)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-bold">{n.title}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {when(n.created_at)}
                      </span>
                    </div>
                    {n.body ? (
                      <p
                        className={`mt-1 text-xs leading-relaxed text-muted-foreground ${
                          isOpen ? "" : "line-clamp-2"
                        }`}
                      >
                        {n.body}
                      </p>
                    ) : null}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-12">
                    {n.workout_id && (
                      <Link
                        to="/workout/$workoutId"
                        params={{ workoutId: n.workout_id }}
                        className="flex h-10 items-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
                      >
                        Open workout
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => bulkRead(!n.read_at, [n.id])}
                      className="flex h-10 items-center gap-2 rounded-xl bg-secondary px-3 text-xs font-bold text-secondary-foreground"
                    >
                      <CheckCheck className="h-4 w-4" />
                      Mark {n.read_at ? "unread" : "read"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm([n.id])}
                      className="flex h-10 items-center gap-2 rounded-xl bg-destructive/10 px-3 text-xs font-bold text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete messages?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.length === 1
                ? "This message will be permanently deleted."
                : `${confirm?.length ?? 0} messages will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
