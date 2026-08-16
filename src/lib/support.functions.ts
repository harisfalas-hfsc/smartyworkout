import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin";

export type SupportMessage = {
  id: string;
  thread_id: string;
  sender: "user" | "admin";
  body: string;
  created_at: string;
};

export type SupportThread = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  status: string;
  last_message_at: string;
  admin_unread: boolean;
  user_unread: boolean;
  created_at: string;
  messages?: SupportMessage[];
};

function clean(v: unknown, max: number) {
  return String(v ?? "").trim().slice(0, max);
}

async function assertAdmin(ctx: { userId: string; claims: any }) {
  const email = ctx.claims?.email as string | undefined;
  if (isAdminEmail(email)) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("Forbidden: admin access required");
}

/** Public contact form submission (visitors who are not signed in). */
export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; email: string; subject: string; message: string }) => input)
  .handler(async ({ data }) => {
    const name = clean(data.name, 120);
    const email = clean(data.email, 200);
    const subject = clean(data.subject, 200) || "Support request";
    const message = clean(data.message, 5000);
    if (!name || !email || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { ok: false as const, error: "Please fill in your name, a valid email and a message." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: thread, error } = await supabaseAdmin
      .from("support_threads")
      .insert({ name, email, subject, admin_unread: true } as never)
      .select("id")
      .single();
    if (error || !thread) return { ok: false as const, error: "Could not send your message." };
    await supabaseAdmin
      .from("support_messages")
      .insert({ thread_id: (thread as any).id, sender: "user", body: message } as never);
    return { ok: true as const };
  });

/** Contact form submission from a signed-in member (links the thread to the account). */
export const submitMemberMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name?: string; email?: string; subject: string; message: string }) => input)
  .handler(async ({ data, context }) => {
    const message = clean(data.message, 5000);
    if (!message) return { ok: false as const, error: "Please write a message." };
    const email = clean(data.email ?? (context.claims as any)?.email, 200);
    const name = clean(data.name, 120) || email.split("@")[0] || "Member";
    const subject = clean(data.subject, 200) || "Support request";
    const { data: thread, error } = await context.supabase
      .from("support_threads")
      .insert({ user_id: context.userId, name, email, subject, admin_unread: true } as never)
      .select("id")
      .single();
    if (error || !thread) return { ok: false as const, error: "Could not send your message." };
    await context.supabase
      .from("support_messages")
      .insert({ thread_id: (thread as any).id, sender: "user", body: message, author_id: context.userId } as never);
    return { ok: true as const, threadId: (thread as any).id as string };
  });

/** Member inbox: all their conversations with the messages inside. */
export const listMyThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ threads: SupportThread[] }> => {
    const { data: threads } = await context.supabase
      .from("support_threads")
      .select("id,user_id,name,email,subject,status,last_message_at,admin_unread,user_unread,created_at")
      .eq("user_id", context.userId)
      .eq("user_deleted", false)
      .order("last_message_at", { ascending: false })
      .limit(100);
    const rows = (threads as SupportThread[] | null) ?? [];
    if (!rows.length) return { threads: [] };
    const { data: msgs } = await context.supabase
      .from("support_messages")
      .select("id,thread_id,sender,body,created_at")
      .in("thread_id", rows.map((t) => t.id))
      .order("created_at", { ascending: true });
    const byThread = new Map<string, SupportMessage[]>();
    for (const m of ((msgs as SupportMessage[] | null) ?? [])) {
      const list = byThread.get(m.thread_id) ?? [];
      list.push(m);
      byThread.set(m.thread_id, list);
    }
    return { threads: rows.map((t) => ({ ...t, messages: byThread.get(t.id) ?? [] })) };
  });

/** Member replies inside one of their own conversations. */
export const replyToThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    const body = clean(data.body, 5000);
    if (!body) return { ok: false as const };
    const { data: thread } = await context.supabase
      .from("support_threads")
      .select("id")
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!thread) return { ok: false as const };
    await context.supabase
      .from("support_messages")
      .insert({ thread_id: data.threadId, sender: "user", body, author_id: context.userId } as never);
    await context.supabase
      .from("support_threads")
      .update({
        admin_unread: true,
        status: "open",
        last_message_at: new Date().toISOString(),
      } as never)
      .eq("id", data.threadId);
    return { ok: true as const };
  });

/** Member marks conversations read / unread. */
export const setThreadsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[]; read: boolean }) => input)
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return { ok: true as const };
    await context.supabase
      .from("support_threads")
      .update({ user_unread: !data.read } as never)
      .eq("user_id", context.userId)
      .in("id", data.ids);
    return { ok: true as const };
  });

/** Member hides conversations from their inbox. */
export const deleteMyThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => input)
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return { ok: true as const };
    await context.supabase
      .from("support_threads")
      .update({ user_deleted: true, user_unread: false } as never)
      .eq("user_id", context.userId)
      .in("id", data.ids);
    return { ok: true as const };
  });

/* ------------------------------- admin side ------------------------------- */

export const adminListThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<{ threads: SupportThread[] } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let q = supabaseAdmin
        .from("support_threads")
        .select("id,user_id,name,email,subject,status,last_message_at,admin_unread,user_unread,created_at")
        .order("last_message_at", { ascending: false })
        .limit(200);
      const search = clean(data.search, 120);
      if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%`);
      const { data: threads, error } = await q;
      if (error) return { error: error.message };
      const rows = (threads as SupportThread[] | null) ?? [];
      if (!rows.length) return { threads: [] };
      const { data: msgs } = await supabaseAdmin
        .from("support_messages")
        .select("id,thread_id,sender,body,created_at")
        .in("thread_id", rows.map((t) => t.id))
        .order("created_at", { ascending: true });
      const byThread = new Map<string, SupportMessage[]>();
      for (const m of ((msgs as SupportMessage[] | null) ?? [])) {
        const list = byThread.get(m.thread_id) ?? [];
        list.push(m);
        byThread.set(m.thread_id, list);
      }
      return { threads: rows.map((t) => ({ ...t, messages: byThread.get(t.id) ?? [] })) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminReplyToThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    try {
      await assertAdmin(context as any);
      const body = clean(data.body, 5000);
      if (!body) return { ok: false as const, error: "Empty reply" };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: thread } = await supabaseAdmin
        .from("support_threads")
        .select("id,user_id,subject")
        .eq("id", data.threadId)
        .maybeSingle();
      if (!thread) return { ok: false as const, error: "Conversation not found" };
      await supabaseAdmin
        .from("support_messages")
        .insert({ thread_id: data.threadId, sender: "admin", body, author_id: context.userId } as never);
      await supabaseAdmin
        .from("support_threads")
        .update({
          admin_unread: false,
          user_unread: true,
          status: "answered",
          last_message_at: new Date().toISOString(),
        } as never)
        .eq("id", data.threadId);
      const userId = (thread as any).user_id as string | null;
      if (userId) {
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          kind: "support",
          title: "Smarty Workout replied to your message",
          body: body.slice(0, 240),
        } as never);
      }
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminSetThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { ids: string[]; read?: boolean; status?: string; deleteThem?: boolean }) => input,
  )
  .handler(async ({ data, context }) => {
    try {
      await assertAdmin(context as any);
      if (!data.ids.length) return { ok: true as const };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (data.deleteThem) {
        await supabaseAdmin.from("support_threads").delete().in("id", data.ids);
        return { ok: true as const };
      }
      const patch: Record<string, unknown> = {};
      if (data.read !== undefined) patch['admin_unread'] = !data.read;
      if (data.status) patch['status'] = data.status;
      if (Object.keys(patch).length) {
        await supabaseAdmin.from("support_threads").update(patch as never).in("id", data.ids);
      }
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed" };
    }
  });

/** Broadcast an announcement to every member or only to active subscribers. */
export const adminBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { audience: "all" | "subscribers"; title: string; body: string }) => input)
  .handler(async ({ data, context }) => {
    try {
      await assertAdmin(context as any);
      const title = clean(data.title, 160);
      const body = clean(data.body, 4000);
      if (!title || !body) return { ok: false as const, error: "Title and message are required." };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      let userIds: string[] = [];
      if (data.audience === "subscribers") {
        const { data: subs } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id,status,current_period_end")
          .in("status", ["active", "trialing"]);
        const now = Date.now();
        userIds = Array.from(
          new Set(
            ((subs as any[]) ?? [])
              .filter((s) => !s.current_period_end || new Date(s.current_period_end).getTime() > now)
              .map((s) => s.user_id as string),
          ),
        );
      } else {
        const { data: profiles } = await supabaseAdmin.from("profiles").select("id").limit(20000);
        userIds = ((profiles as any[]) ?? []).map((p) => p.id as string);
      }
      if (!userIds.length) return { ok: true as const, sent: 0 };

      const stamp = new Date().toISOString();
      const rows = userIds.map((id) => ({
        user_id: id,
        kind: "announcement",
        title,
        body,
        dedupe_key: `broadcast-${stamp}-${id}`,
      }));
      for (let i = 0; i < rows.length; i += 500) {
        await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 500) as never);
      }
      return { ok: true as const, sent: rows.length };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Failed" };
    }
  });
