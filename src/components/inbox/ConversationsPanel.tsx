import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  MailOpen,
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteMyThreads,
  listMyThreads,
  replyToThread,
  setThreadsRead,
  submitMemberMessage,
  type SupportThread,
} from "@/lib/support.functions";
import { useAuth } from "@/hooks/useAuth";
import { loadRemote } from "@/lib/remote-data";
import { announceInboxChanged } from "@/lib/inbox-sync";
import { useOnlineStatus } from "@/lib/connectivity";
import { formatDateTime } from "@/lib/date-format";

function when(iso: string) {
  return formatDateTime(iso);
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
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");

  const reload = useCallback(async () => {
    try {
      const res = await loadRemote("inbox:threads", () => load({}), user?.id);
      setThreads(res.threads);
    } finally {
      setLoading(false);
    }
  }, [load, user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const unread = useMemo(() => threads.filter((t) => t.user_unread).length, [threads]);
  const visibleThreads = useMemo(() => {
    const filtered = threads.filter((thread) => {
      if (readFilter === "unread") return thread.user_unread;
      if (readFilter === "read") return !thread.user_unread;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const difference =
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      return sortOrder === "latest" ? difference : -difference;
    });
  }, [readFilter, sortOrder, threads]);

  useEffect(() => {
    onUnread?.(unread);
    announceInboxChanged({ messagesUnread: unread });
  }, [unread, onUnread]);

  async function openThread(t: SupportThread) {
    setOpenId((cur) => (cur === t.id ? null : t.id));
    setDraft("");
    if (t.user_unread) {
      setThreads((prev) => prev.map((x) => (x.id === t.id ? { ...x, user_unread: false } : x)));
      announceInboxChanged({ readMessageIds: [t.id] });
      try {
        await setRead({ data: { ids: [t.id], read: true } });
        announceInboxChanged();
      } catch {
        toast.error("Could not update that conversation.");
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
    announceInboxChanged(read ? { readMessageIds: [t.id] } : { unreadMessageIds: [t.id] });
    try {
      await setRead({ data: { ids: [t.id], read } });
      announceInboxChanged();
    } catch {
      toast.error("Could not update that conversation.");
    }
  }

  async function markAllRead() {
    const ids = threads.filter((t) => t.user_unread).map((t) => t.id);
    if (!ids.length) return;
    setThreads((prev) => prev.map((t) => ({ ...t, user_unread: false })));
    announceInboxChanged({ readMessageIds: ids });
    try {
      await setRead({ data: { ids, read: true } });
      announceInboxChanged();
    } catch {
      await enqueueAction("thread-read", { ids, read: true }, user?.id);
    }
  }

  async function deleteAll() {
    const ids = threads.map((t) => t.id);
    if (!ids.length) return;
    setThreads([]);
    setOpenId(null);
    announceInboxChanged({ removedMessageIds: ids, messagesUnread: 0 });
    try {
      await removeThreads({ data: { ids } });
      announceInboxChanged();
    } catch {
      await enqueueAction("thread-delete", { ids }, user?.id);
      toast.info("Deleted on this device — it will sync when you are online.");
    }
    toast.success("Conversations deleted");
  }

  async function deleteOne(id: string) {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (openId === id) setOpenId(null);
    announceInboxChanged({ removedMessageIds: [id] });
    try {
      await removeThreads({ data: { ids: [id] } });
      announceInboxChanged();
    } catch {
      await enqueueAction("thread-delete", { ids: [id] }, user?.id);
      toast.info("Deleted on this device — it will sync when you are online.");
    }
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button
          variant={composing ? "default" : "secondary"}
          onClick={() => setComposing((v) => !v)}
          className="rounded-2xl"
          aria-pressed={composing}
        >
          <MessageSquare className="mr-2 h-4 w-4" /> {composing ? "Close form" : "New message"}
        </Button>
        <Button
          variant="secondary"
          className="rounded-2xl"
          onClick={markAllRead}
          disabled={!unread}
        >
          <MailOpen className="mr-2 h-4 w-4" /> Mark all read
        </Button>
        <Button
          variant="ghost"
          className="col-span-2 rounded-2xl text-destructive sm:col-span-1"
          onClick={deleteAll}
          disabled={!threads.length}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete all
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2" aria-label="Message filters">
        <Select
          value={readFilter}
          onValueChange={(value) => setReadFilter(value as typeof readFilter)}
        >
          <SelectTrigger className="h-10 rounded-2xl border-2 border-primary bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All messages</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortOrder}
          onValueChange={(value) => setSortOrder(value as typeof sortOrder)}
        >
          <SelectTrigger className="h-10 rounded-2xl border-2 border-primary bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
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
          <Button
            onClick={sendNew}
            disabled={busy || !newBody.trim()}
            className="w-full rounded-2xl"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send message
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visibleThreads.length === 0 ? (
        <p className="rounded-2xl border-2 border-blue-400 p-6 text-center text-sm text-muted-foreground">
          {threads.length
            ? "No messages match this filter."
            : "No conversations yet. Start one above."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleThreads.map((t) => {
            const open = openId === t.id;
            const messages = t.messages ?? [];
            const latestQuestion = [...messages]
              .reverse()
              .find((message) => message.sender === "user");
            const latestReply = [...messages]
              .reverse()
              .find((message) => message.sender === "admin");
            return (
              <li
                key={t.id}
                className="overflow-hidden rounded-2xl border-2 border-primary bg-card"
              >
                <button
                  type="button"
                  onClick={() => openThread(t)}
                  className="flex w-full items-start gap-3 p-3 text-left sm:p-4"
                  aria-expanded={open}
                >
                  <span className="mt-0.5 text-primary">
                    {t.user_unread ? (
                      <Mail className="h-4 w-4" />
                    ) : (
                      <MailOpen className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {t.user_unread && <span className="mr-1 text-primary">•</span>}
                      {t.subject}
                    </span>
                    {!open && latestQuestion && (
                      <span className="mt-1 block line-clamp-1 text-xs text-muted-foreground">
                        <strong className="text-foreground">You:</strong> {latestQuestion.body}
                      </span>
                    )}
                    {!open && latestReply && (
                      <span className="block line-clamp-1 text-xs text-muted-foreground">
                        <strong className="text-primary">Reply:</strong> {latestReply.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {when(t.last_message_at)} · {messages.length}{" "}
                      {messages.length === 1 ? "message" : "messages"}
                    </span>
                  </span>
                  {open ? (
                    <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>

                {open && (
                  <div className="space-y-3 border-t border-border p-4">
                    <div className="space-y-3">
                      {messages.map((m) => (
                        <div
                          key={m.id}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            m.sender === "admin"
                              ? "border-primary/40 bg-primary/10 text-foreground"
                              : "border-border bg-secondary text-secondary-foreground"
                          }`}
                        >
                          <p
                            className={`mb-1 text-xs font-bold ${m.sender === "admin" ? "text-primary" : "text-foreground"}`}
                          >
                            {m.sender === "admin" ? "Smarty Workout reply" : "Your message"}
                          </p>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {when(m.created_at)}
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
                      <Button
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={() => toggleRead(t)}
                      >
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
