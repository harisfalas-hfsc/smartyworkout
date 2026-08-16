import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Mail, MailOpen, Megaphone, Search, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminBroadcast,
  adminListThreads,
  adminReplyToThread,
  adminSetThreads,
  type SupportThread,
} from "@/lib/support.functions";

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminMessagesTab() {
  const list = useServerFn(adminListThreads);
  const reply = useServerFn(adminReplyToThread);
  const setThreadsFn = useServerFn(adminSetThreads);
  const broadcast = useServerFn(adminBroadcast);

  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const [audience, setAudience] = useState<"all" | "subscribers">("all");
  const [bTitle, setBTitle] = useState("");
  const [bBody, setBBody] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(false);

  const reload = useCallback(
    async (q?: string) => {
      setLoading(true);
      const res = await list({ data: { search: q ?? "" } });
      setLoading(false);
      if ("error" in res) return toast.error(res.error);
      setThreads(res.threads);
    },
    [list],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const unread = useMemo(() => threads.filter((t) => t.admin_unread).length, [threads]);

  async function openThread(t: SupportThread) {
    setOpenId((cur) => (cur === t.id ? null : t.id));
    setDraft("");
    if (t.admin_unread) {
      setThreads((prev) => prev.map((x) => (x.id === t.id ? { ...x, admin_unread: false } : x)));
      await setThreadsFn({ data: { ids: [t.id], read: true } }).catch(() => undefined);
    }
  }

  async function sendReply(id: string) {
    if (!draft.trim()) return;
    setBusy(true);
    const res = await reply({ data: { threadId: id, body: draft } }).catch(() => ({ ok: false }));
    setBusy(false);
    if (!res.ok) return toast.error("Could not send the reply.");
    setDraft("");
    toast.success("Reply sent to the member");
    void reload(search);
  }

  async function markAllRead() {
    const ids = threads.filter((t) => t.admin_unread).map((t) => t.id);
    if (!ids.length) return;
    setThreads((prev) => prev.map((t) => ({ ...t, admin_unread: false })));
    await setThreadsFn({ data: { ids, read: true } }).catch(() => undefined);
  }

  async function removeThreads(ids: string[]) {
    if (!ids.length) return;
    setThreads((prev) => prev.filter((t) => !ids.includes(t.id)));
    if (openId && ids.includes(openId)) setOpenId(null);
    await setThreadsFn({ data: { ids, deleteThem: true } }).catch(() => undefined);
    toast.success("Deleted");
  }

  async function sendBroadcast() {
    if (!bTitle.trim() || !bBody.trim()) return;
    setBusy(true);
    const res = await broadcast({ data: { audience, title: bTitle, body: bBody } }).catch(() => ({
      ok: false as const,
      error: "Failed",
    }));
    setBusy(false);
    if (!res.ok) return toast.error("error" in res ? String(res.error) : "Could not send.");
    setBTitle("");
    setBBody("");
    setShowBroadcast(false);
    toast.success(`Announcement sent to ${"sent" in res ? res.sent : 0} member(s)`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload(search)}
            placeholder="Search name, email or subject"
            className="pl-9"
          />
        </div>
        <Button variant="secondary" className="rounded-2xl" onClick={() => reload(search)}>
          Search
        </Button>
        <Button variant="secondary" className="rounded-2xl" onClick={markAllRead} disabled={!unread}>
          <MailOpen className="mr-2 h-4 w-4" /> Mark all read ({unread})
        </Button>
        <Button className="rounded-2xl" onClick={() => setShowBroadcast((v) => !v)}>
          <Megaphone className="mr-2 h-4 w-4" /> Broadcast
        </Button>
      </div>

      {showBroadcast && (
        <div className="space-y-3 rounded-2xl border-2 border-primary bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            {(["all", "subscribers"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                className={`h-10 rounded-2xl text-sm font-bold ${
                  audience === a
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {a === "all" ? "All users" : "Subscribers only"}
              </button>
            ))}
          </div>
          <Input
            placeholder="Announcement title"
            value={bTitle}
            onChange={(e) => setBTitle(e.target.value)}
            maxLength={160}
          />
          <Textarea
            rows={4}
            placeholder="Write your announcement…"
            value={bBody}
            onChange={(e) => setBBody(e.target.value)}
            maxLength={4000}
            className="resize-none"
          />
          <Button
            className="w-full rounded-2xl"
            onClick={sendBroadcast}
            disabled={busy || !bTitle.trim() || !bBody.trim()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send to {audience === "all" ? "all users" : "subscribers"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Announcements land in every recipient's notifications inbox.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : threads.length === 0 ? (
        <p className="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
          No messages yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {threads.map((t) => {
            const open = openId === t.id;
            const last = t.messages?.[t.messages.length - 1];
            return (
              <li key={t.id} className="rounded-2xl border border-blue-400 bg-card">
                <button
                  type="button"
                  onClick={() => openThread(t)}
                  className="flex w-full items-start gap-3 p-4 text-left"
                >
                  <span className="mt-0.5 text-primary">
                    {t.admin_unread ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {t.admin_unread && <span className="mr-1 text-primary">•</span>}
                      {t.subject}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.name} · {t.email} {t.user_id ? "" : "· guest"}
                    </span>
                    {last && (
                      <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                        {last.sender === "admin" ? "You: " : ""}
                        {last.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {when(t.last_message_at)} · {t.status}
                    </span>
                  </span>
                </button>

                {open && (
                  <div className="space-y-3 border-t border-border p-4">
                    <div className="space-y-2">
                      {(t.messages ?? []).map((m) => (
                        <div
                          key={m.id}
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            m.sender === "admin"
                              ? "ml-auto bg-primary/10 text-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {m.sender === "admin" ? "You" : t.name} · {when(m.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="Write your reply…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={5000}
                      className="resize-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => sendReply(t.id)}
                        disabled={busy || !draft.trim()}
                        className="rounded-2xl"
                      >
                        {busy ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Send reply
                      </Button>
                      {!t.user_id && (
                        <Button variant="secondary" className="rounded-2xl" asChild>
                          <a href={`mailto:${t.email}?subject=Re: ${encodeURIComponent(t.subject)}`}>
                            Reply by email
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="rounded-2xl text-destructive"
                        onClick={() => removeThreads([t.id])}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                    {!t.user_id && (
                      <p className="text-xs text-muted-foreground">
                        This message came from a visitor who is not signed in — they will not see an
                        in-app reply, so answer them by email.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
