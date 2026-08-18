import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, MailOpen, MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMyThreads,
  listMyThreads,
  replyToThread,
  setThreadsRead,
  submitMemberMessage,
  type SupportThread,
} from "@/lib/support.functions";
import { useAuth } from "@/hooks/useAuth";
import { offlineFirst } from "@/lib/offline/offline-first";
import { enqueueAction } from "@/lib/offline/queue";
import { announceInboxChanged } from "@/lib/inbox-sync";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationsPanel({
  onUnread,
  defaultComposing,
}: {
  onUnread?: (n: number) => void;
  defaultComposing?: boolean;
}) {
  const load = useServerFn(listMyThreads);
  const reply = useServerFn(replyToThread);
  const start = useServerFn(submitMemberMessage);
  const setRead = useServerFn(setThreadsRead);
  const removeThreads = useServerFn(deleteMyThreads);
  const { user } = useAuth();
  const online = useOnlineStatus();

  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [composing, setComposing] = useState(Boolean(defaultComposing));

  const reload = useCallback(async () => {
    try {
      const res = await offlineFirst("inbox:threads", () => load({}), user?.id);
      setThreads(res.threads);
    } finally {
      setLoading(false);
    }
  }, [load, user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const unread = useMemo(() => threads.filter((t) => t.user_unread).length, [threads]);

  useEffect(() => {
    onUnread?.(unread);
    announceInboxChanged({ messagesUnread: unread });
  }, [unread, onUnread]);

  async function openThread(t: SupportThread) {
    setOpenId((cur) => (cur === t.id ? null : t.id));
    setDraft("");
    if (t.user_unread) {
      setThreads((prev) => prev.map((x) => (x.id === t.id ? { ...x, user_unread: false } : x)));
      try {
        await setRead({ data: { ids: [t.id], read: true } });
      } catch {
        await enqueueAction("thread-read", { ids: [t.id], read: true }, user?.id);
      }
    }
  }

  async function sendReply(id: string) {
    if (!draft.trim()) return;
    if (!online) return toast.error("You must be online to send a message.");
    setBusy(true);
    const res = await reply({ data: { threadId: id, body: draft } }).catch(() => ({ ok: false }));
    setBusy(false);
    if (!res.ok) return toast.error("Could not send your reply.");
    setDraft("");
    toast.success("Reply sent");
    void reload();
  }

  async function sendNew() {
    if (!newBody.trim()) return;
    if (!online) return toast.error("You must be online to send a message.");
    setBusy(true);
    const res = await start({ data: { subject: newSubject, message: newBody } }).catch(() => ({
      ok: false as const,
    }));
    setBusy(false);
    if (!res.ok) return toast.error("Could not send your message.");
    setNewSubject("");
    setNewBody("");
    setComposing(false);
    toast.success("Message sent — we reply within 24–48 hours.");
    void reload();
  }

  async function toggleRead(t: SupportThread) {
    const read = t.user_unread;
    setThreads((prev) => prev.map((x) => (x.id === t.id ? { ...x, user_unread: !read } : x)));
    try {
      await setRead({ data: { ids: [t.id], read } });
    } catch {
      await enqueueAction("thread-read", { ids: [t.id], read }, user?.id);
    }
  }

  async function markAllRead() {
    const ids = threads.filter((t) => t.user_unread).map((t) => t.id);
    if (!ids.length) return;
    setThreads((prev) => prev.map((t) => ({ ...t, user_unread: false })));
    try {
      await setRead({ data: { ids, read: true } });
    } catch {
      await enqueueAction("thread-read", { ids, read: true }, user?.id);
    }
  }

  async function deleteAll() {
    const ids = threads.map((t) => t.id);
    if (!ids.length) return;
    setThreads([]);
    setOpenId(null);
    try {
      await removeThreads({ data: { ids } });
    } catch {
      await enqueueAction("thread-delete", { ids }, user?.id);
      toast.info("Deleted on this device — it will sync when you are online.");
    }
    toast.success("Conversations deleted");
  }

  async function deleteOne(id: string) {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (openId === id) setOpenId(null);
    try {
      await removeThreads({ data: { ids: [id] } });
    } catch {
      await enqueueAction("thread-delete", { ids: [id] }, user?.id);
      toast.info("Deleted on this device — it will sync when you are online.");
    }
  }

  return (
    <div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => setComposing((v) => !v)} className="rounded-2xl">
          <MessageSquare className="mr-2 h-4 w-4" /> New message
        </Button>
        <Button variant="secondary" className="rounded-2xl" onClick={markAllRead} disabled={!unread}>
          <MailOpen className="mr-2 h-4 w-4" /> Mark all read
        </Button>
        <Button
          variant="ghost"
          className="rounded-2xl text-destructive"
          onClick={deleteAll}
          disabled={!threads.length}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete all
        </Button>
      </div>

      {composing && (
        <div className="mb-5 space-y-3 rounded-2xl border-2 border-primary bg-card p-4">
          <Input
            placeholder="Subject"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            maxLength={200}
          />
          <Textarea
            rows={5}
            placeholder="How can we help?"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            maxLength={5000}
            className="resize-none"
          />
          <Button onClick={sendNew} disabled={busy || !newBody.trim()} className="w-full rounded-2xl">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send message
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : threads.length === 0 ? (
        <p className="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
          No conversations yet. Start one above — we reply within 24 to 48 hours.
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
                    {t.user_unread ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {t.user_unread && <span className="mr-1 text-primary">•</span>}
                      {t.subject}
                    </span>
                    {last && (
                      <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                        {last.sender === "admin" ? "Smarty Workout: " : "You: "}
                        {last.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {when(t.last_message_at)}
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
                              ? "bg-primary/10 text-foreground"
                              : "ml-auto bg-secondary text-secondary-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {m.sender === "admin" ? "Smarty Workout" : "You"} · {when(m.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="Write a reply…"
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
                      <Button variant="secondary" className="rounded-2xl" onClick={() => toggleRead(t)}>
                        Mark as {t.user_unread ? "read" : "unread"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="rounded-2xl text-destructive"
                        onClick={() => deleteOne(t.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
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
