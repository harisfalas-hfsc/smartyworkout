import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin";
import type { Category } from "@/lib/workout/spec";
import type { WorkoutRules } from "@/lib/settings.server";

async function assertAdmin(ctx: { supabase: any; userId: string; claims: any }) {
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

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  age: number | null;
  credits: number;
  purchases: number;
  created_at: string;
  is_admin: boolean;
  has_active_subscription: boolean;
  subscription_status: string | null;
  subscription_provider: string | null;
  current_period_end: string | null;
  workouts: number;
  wod_subscribed: boolean;
  profile_complete: boolean;
};

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { search?: string }) => data)
  .handler(async ({ context, data }): Promise<{ users: AdminUserRow[] } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Fetch auth users to get email + created_at (paginated up to 1000)
      const authUsersMap = new Map<string, { email: string | null; created_at: string }>();
      let page = 1;
      for (let i = 0; i < 10; i++) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) return { error: error.message };
        for (const u of list.users) {
          authUsersMap.set(u.id, { email: u.email ?? null, created_at: u.created_at });
        }
        if (list.users.length < 200) break;
        page++;
      }

      const { data: profiles, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, display_name, bonus_credits, created_at, age, onboarded, wod_mode, fitness_level, primary_goal, preferred_environment, typical_duration_min, preferred_equipment",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (pErr) return { error: pErr.message };

      const ids = (profiles ?? []).map((p: any) => p.id);
      const filterIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];

      const [{ data: roles }, { data: sessions }, { data: subs }, { data: workouts }] =
        await Promise.all([
          supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", filterIds),
          supabaseAdmin.from("generation_sessions").select("user_id, status").in("user_id", filterIds),
          supabaseAdmin
            .from("subscriptions")
            .select("user_id, status, provider, current_period_end, updated_at")
            .in("user_id", filterIds)
            .order("updated_at", { ascending: false }),
          supabaseAdmin.from("workouts").select("user_id").in("user_id", filterIds).limit(20000),
        ]);

      const adminByUser = new Set<string>();
      for (const r of (roles ?? []) as any[]) if (r.role === "admin") adminByUser.add(r.user_id);

      const purchasesByUser = new Map<string, number>();
      for (const s of (sessions ?? []) as any[]) {
        if (s.status === "paid" || s.status === "completed") {
          purchasesByUser.set(s.user_id, (purchasesByUser.get(s.user_id) ?? 0) + 1);
        }
      }

      const workoutsByUser = new Map<string, number>();
      for (const w of (workouts ?? []) as any[]) {
        workoutsByUser.set(w.user_id, (workoutsByUser.get(w.user_id) ?? 0) + 1);
      }

      const subByUser = new Map<string, any>();
      for (const s of (subs ?? []) as any[]) if (!subByUser.has(s.user_id)) subByUser.set(s.user_id, s);

      const users: AdminUserRow[] = (profiles ?? []).map((p: any) => {
        const auth = authUsersMap.get(p.id);
        const sub = subByUser.get(p.id);
        const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
        const active =
          Boolean(sub) &&
          ["active", "trialing"].includes(sub.status) &&
          (!periodEnd || periodEnd > Date.now());
        return {
          id: p.id,
          email: auth?.email ?? "",
          name: p.display_name ?? "",
          age: p.age ?? null,
          credits: p.bonus_credits ?? 0,
          purchases: purchasesByUser.get(p.id) ?? 0,
          created_at: p.created_at,
          is_admin: isAdminEmail(auth?.email) || adminByUser.has(p.id),
          has_active_subscription: active,
          subscription_status: sub?.status ?? null,
          subscription_provider: sub?.provider ?? null,
          current_period_end: sub?.current_period_end ?? null,
          workouts: workoutsByUser.get(p.id) ?? 0,
          wod_subscribed: Boolean(p.wod_mode),
          profile_complete: Boolean(
            p.onboarded &&
              p.age &&
              p.fitness_level &&
              p.primary_goal &&
              p.preferred_environment &&
              p.typical_duration_min &&
              Array.isArray(p.preferred_equipment) &&
              p.preferred_equipment.length,
          ),
        };
      });

      const q = data.search?.trim().toLowerCase();
      const filtered = q
        ? users.filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
        : users;

      return { users: filtered };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to list users" };
    }
  });

export type AdminStats = {
  totalUsers: number;
  newUsers30d: number;
  activeSubscribers: number;
  canceledSubscribers: number;
  wodSubscribers: number;
  mrrEur: number;
  workoutsTotal: number;
  workoutsToday: number;
  workoutsCompleted: number;
  wodWorkouts: number;
  admins: number;
};

export const adminGetStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ stats: AdminStats } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { getWorkoutRules } = await import("@/lib/settings.server");
      const rules = await getWorkoutRules();

      const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const count = (q: any) => q.then((r: any) => r.count ?? 0);
      const [
        totalUsers,
        newUsers30d,
        wodSubscribers,
        workoutsTotal,
        workoutsToday,
        workoutsCompleted,
        wodWorkouts,
        admins,
      ] = await Promise.all([
        count(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true })),
        count(
          supabaseAdmin
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since30),
        ),
        count(
          supabaseAdmin
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("wod_mode", true),
        ),
        count(supabaseAdmin.from("workouts").select("id", { count: "exact", head: true })),
        count(
          supabaseAdmin
            .from("workouts")
            .select("id", { count: "exact", head: true })
            .gte("created_at", startOfToday.toISOString()),
        ),
        count(
          supabaseAdmin
            .from("workouts")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed"),
        ),
        count(
          supabaseAdmin
            .from("workouts")
            .select("id", { count: "exact", head: true })
            .eq("is_wod", true),
        ),
        count(supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin")),
      ]);

      const { data: subs } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id, status, current_period_end")
        .limit(5000);
      const activeUsers = new Set<string>();
      const canceledUsers = new Set<string>();
      for (const s of (subs ?? []) as any[]) {
        const end = s.current_period_end ? new Date(s.current_period_end).getTime() : null;
        if (["active", "trialing"].includes(s.status) && (!end || end > Date.now()))
          activeUsers.add(s.user_id);
        else canceledUsers.add(s.user_id);
      }
      for (const id of activeUsers) canceledUsers.delete(id);

      return {
        stats: {
          totalUsers,
          newUsers30d,
          activeSubscribers: activeUsers.size,
          canceledSubscribers: canceledUsers.size,
          wodSubscribers,
          mrrEur: Number((activeUsers.size * rules.membershipPriceEur).toFixed(2)),
          workoutsTotal,
          workoutsToday,
          workoutsCompleted,
          wodWorkouts,
          admins,
        },
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to load stats" };
    }
  });

export type AdminPayment = {
  id: string;
  amount: number;
  currency: string;
  created: string;
  email: string | null;
  status: string;
  refunded: boolean;
};

export type AdminRevenue = {
  environment: "live" | "sandbox";
  currency: string;
  total: number;
  last30: number;
  byMonth: { month: string; amount: number }[];
  payments: AdminPayment[];
};

export const adminGetRevenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment?: "live" | "sandbox" }) => data)
  .handler(async ({ context, data }): Promise<{ revenue: AdminRevenue } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const environment = data.environment ?? "live";
      const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
      try {
        const stripe = createStripeClient(environment);
        const charges = await stripe.charges.list({ limit: 100 });
        const rows = charges.data.filter((c) => c.status === "succeeded");
        const currency = (rows[0]?.currency ?? "eur").toUpperCase();
        const since30 = Date.now() - 30 * 86_400_000;
        const byMonth = new Map<string, number>();
        let total = 0;
        let last30 = 0;
        const payments: AdminPayment[] = [];
        for (const c of rows) {
          const net = (c.amount - (c.amount_refunded ?? 0)) / 100;
          total += net;
          const createdMs = c.created * 1000;
          if (createdMs >= since30) last30 += net;
          const month = new Date(createdMs).toISOString().slice(0, 7);
          byMonth.set(month, Number(((byMonth.get(month) ?? 0) + net).toFixed(2)));
          payments.push({
            id: c.id,
            amount: net,
            currency: c.currency.toUpperCase(),
            created: new Date(createdMs).toISOString(),
            email: c.billing_details?.email ?? c.receipt_email ?? null,
            status: c.status,
            refunded: Boolean(c.amount_refunded),
          });
        }
        return {
          revenue: {
            environment,
            currency,
            total: Number(total.toFixed(2)),
            last30: Number(last30.toFixed(2)),
            byMonth: [...byMonth.entries()]
              .sort((a, b) => (a[0] < b[0] ? 1 : -1))
              .slice(0, 12)
              .map(([month, amount]) => ({ month, amount })),
            payments: payments.slice(0, 50),
          },
        };
      } catch (stripeError) {
        return { error: getStripeErrorMessage(stripeError) };
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to load revenue" };
    }
  });

/** Gives a member premium access for a number of months, without charging them. */
export const adminGrantPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; months: number }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true; until: string } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const months = Math.max(1, Math.min(36, Math.round(Number(data.months) || 1)));
      if (!data.userId) return { error: "Missing user" };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: existing } = await supabaseAdmin
        .from("subscriptions")
        .select("id, current_period_end")
        .eq("user_id", data.userId)
        .eq("provider", "admin_grant")
        .maybeSingle();

      const base =
        existing?.current_period_end && new Date(existing.current_period_end).getTime() > Date.now()
          ? new Date(existing.current_period_end)
          : new Date();
      const until = new Date(base);
      until.setMonth(until.getMonth() + months);

      if (existing) {
        const { error } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "active",
            current_period_end: until.toISOString(),
            cancel_at_period_end: false,
          } as never)
          .eq("id", (existing as any).id);
        if (error) return { error: error.message };
      } else {
        const { error } = await supabaseAdmin.from("subscriptions").insert({
          user_id: data.userId,
          provider: "admin_grant",
          status: "active",
          environment: "live",
          current_period_start: new Date().toISOString(),
          current_period_end: until.toISOString(),
        } as never);
        if (error) return { error: error.message };
      }
      return { ok: true, until: until.toISOString() };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to grant premium" };
    }
  });

/** Revokes app-side premium access. Stripe billing itself is managed in Stripe. */
export const adminRevokePremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "canceled",
          current_period_end: new Date().toISOString(),
          cancel_at_period_end: true,
        } as never)
        .eq("user_id", data.userId);
      if (error) return { error: error.message };
      await supabaseAdmin
        .from("profiles")
        .update({ wod_mode: false, auto_workout_enabled: false } as never)
        .eq("id", data.userId);
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to revoke premium" };
    }
  });

export const adminGrantCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; credits: number }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true; credits: number } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      if (!data.userId || !Number.isFinite(data.credits) || data.credits === 0)
        return { error: "Invalid input" };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("bonus_credits")
        .eq("id", data.userId)
        .maybeSingle();
      if (!p) return { error: "User not found" };
      const next = Math.max(0, ((p as any).bonus_credits ?? 0) + data.credits);
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ bonus_credits: next })
        .eq("id", data.userId);
      if (error) return { error: error.message };
      return { ok: true, credits: next };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; makeAdmin: boolean }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (data.makeAdmin) {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
        if (error) return { error: error.message };
      } else {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", data.userId)
          .eq("role", "admin");
        if (error) return { error: error.message };
      }
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export type AdminCycleDay = {
  day: number;
  category: string;
  difficulty: string | null;
  stars: [number, number] | null;
  strengthFocus?: string;
  overridden: boolean;
};

export const adminGetSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ rules: WorkoutRules; cycle: AdminCycleDay[] } | { error: string }> => {
      try {
        await assertAdmin(context as any);
        const { getWorkoutRules, resolveFullCycle, getCycleOverrides } = await import(
          "@/lib/settings.server"
        );
        const [rules, cycle, overrides] = await Promise.all([
          getWorkoutRules(),
          resolveFullCycle(),
          getCycleOverrides(),
        ]);
        return {
          rules,
          cycle: cycle.map((d) => ({
            day: d.day,
            category: d.category,
            difficulty: d.difficulty,
            stars: d.stars,
            ...(d.strengthFocus ? { strengthFocus: d.strengthFocus } : {}),
            overridden: Boolean(overrides[String(d.day)]),
          })),
        };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to load settings" };
      }
    },
  );

export const adminSaveRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Partial<WorkoutRules>) => data)
  .handler(async ({ context, data }): Promise<{ rules: WorkoutRules } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { saveWorkoutRules } = await import("@/lib/settings.server");
      return { rules: await saveWorkoutRules(data) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to save rules" };
    }
  });

export const adminSaveCycleDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      day: number;
      category?: Category;
      difficulty?: "Beginner" | "Intermediate" | "Advanced" | null;
      reset?: boolean;
    }) => data,
  )
  .handler(async ({ context, data }): Promise<{ ok: true } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { saveCycleOverride } = await import("@/lib/settings.server");
      if (data.reset) await saveCycleOverride(data.day, null);
      else
        await saveCycleOverride(data.day, {
          ...(data.category ? { category: data.category } : {}),
          ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
        });
      return { ok: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to save cycle day" };
    }
  });

/* ---------------------------------------------------------------------------
 * Workout archive — every workout ever generated, for any member,
 * by request or as Workout of the Day.
 * ------------------------------------------------------------------------- */

export type AdminWorkoutRow = {
  id: string;
  serial: number | null;
  name: string;
  category: string;
  format: string | null;
  focus: string | null;
  difficulty_stars: number;
  difficulty_label: string | null;
  duration_min: number;
  equipment: string[];
  location: string | null;
  mood: string | null;
  status: string;
  is_wod: boolean;
  wod_date: string | null;
  created_at: string;
  completed_at: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
};

export type AdminWorkoutFilters = {
  userId?: string;
  search?: string;
  category?: string;
  focus?: string;
  /** all | wod | request */
  source?: string;
  status?: string;
  stars?: number;
  equipment?: string;
  /** all | short (<=15) | medium (16-35) | long (>35) */
  duration?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type AdminWorkoutFacets = {
  categories: string[];
  focuses: string[];
  equipment: string[];
  statuses: string[];
};

export const adminListWorkouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AdminWorkoutFilters) => data)
  .handler(
    async ({
      context,
      data,
    }): Promise<
      | { workouts: AdminWorkoutRow[]; total: number; facets: AdminWorkoutFacets }
      | { error: string }
    > => {
      try {
        await assertAdmin(context as any);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const page = Math.max(1, Math.round(Number(data.page) || 1));
        const pageSize = Math.min(100, Math.max(10, Math.round(Number(data.pageSize) || 25)));

        let q = supabaseAdmin
          .from("workouts")
          .select(
            "id, serial, name, category, format, focus, difficulty_stars, difficulty_label, duration_min, equipment, location, mood, status, is_wod, wod_date, created_at, completed_at, user_id",
            { count: "exact" },
          )
          .order("created_at", { ascending: false });

        if (data.userId) q = q.eq("user_id", data.userId);
        if (data.category && data.category !== "all") q = q.eq("category", data.category);
        if (data.focus && data.focus !== "all") q = q.eq("focus", data.focus);
        if (data.status && data.status !== "all") q = q.eq("status", data.status);
        if (data.source === "wod") q = q.eq("is_wod", true);
        if (data.source === "request") q = q.eq("is_wod", false);
        if (data.stars) q = q.eq("difficulty_stars", data.stars);
        if (data.equipment && data.equipment !== "all") q = q.contains("equipment", [data.equipment]);
        if (data.duration === "short") q = q.lte("duration_min", 15);
        if (data.duration === "medium") q = q.gte("duration_min", 16).lte("duration_min", 35);
        if (data.duration === "long") q = q.gt("duration_min", 35);
        if (data.from) q = q.gte("created_at", new Date(data.from).toISOString());
        if (data.to) {
          const end = new Date(data.to);
          end.setHours(23, 59, 59, 999);
          q = q.lte("created_at", end.toISOString());
        }
        const search = data.search?.trim();
        if (search) {
          // Match the workout name, or any member whose name/email matches.
          const { data: matches } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .or(`display_name.ilike.%${search}%,email.ilike.%${search}%`)
            .limit(500);
          const ids = ((matches ?? []) as any[]).map((p) => p.id);
          if (ids.length) {
            q = q.or(`name.ilike.%${search}%,user_id.in.(${ids.join(",")})`);
          } else {
            q = q.ilike("name", `%${search}%`);
          }
        }

        const { data: rows, error, count } = await q.range((page - 1) * pageSize, page * pageSize - 1);
        if (error) return { error: error.message };

        const list = (rows ?? []) as any[];
        const userIds = [...new Set(list.map((w) => w.user_id))];
        const nameById = new Map<string, { name: string; email: string }>();
        if (userIds.length) {
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, display_name, email")
            .in("id", userIds);
          for (const p of (profiles ?? []) as any[])
            nameById.set(p.id, { name: p.display_name ?? "", email: p.email ?? "" });

          // Older profiles can predate the email column. Admin Auth is the
          // authoritative fallback, so every archive row identifies its owner.
          await Promise.all(
            userIds.map(async (id) => {
              const current = nameById.get(id);
              if (current?.email) return;
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);
              const user = authUser.user;
              if (!user) return;
              nameById.set(id, {
                name:
                  current?.name ||
                  String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""),
                email: user.email ?? "",
              });
            }),
          );
        }

        // Facet values across the whole archive so filters never show dead options.
        const { data: facetRows } = await supabaseAdmin
          .from("workouts")
          .select("category, focus, equipment, status")
          .limit(20000);
        const categories = new Set<string>();
        const focuses = new Set<string>();
        const equipment = new Set<string>();
        const statuses = new Set<string>();
        for (const r of (facetRows ?? []) as any[]) {
          if (r.category) categories.add(r.category);
          if (r.focus) focuses.add(r.focus);
          if (r.status) statuses.add(r.status);
          for (const e of (r.equipment ?? []) as string[]) if (e) equipment.add(e);
        }

        return {
          total: count ?? list.length,
          facets: {
            categories: [...categories].sort(),
            focuses: [...focuses].sort(),
            equipment: [...equipment].sort(),
            statuses: [...statuses].sort(),
          },
          workouts: list.map((w) => ({
            id: w.id,
            serial: w.serial ?? null,
            name: w.name,
            category: w.category,
            format: w.format ?? null,
            focus: w.focus ?? null,
            difficulty_stars: w.difficulty_stars ?? 0,
            difficulty_label: w.difficulty_label ?? null,
            duration_min: w.duration_min ?? 0,
            equipment: (w.equipment ?? []) as string[],
            location: w.location ?? null,
            mood: w.mood ?? null,
            status: w.status,
            is_wod: Boolean(w.is_wod),
            wod_date: w.wod_date ?? null,
            created_at: w.created_at,
            completed_at: w.completed_at ?? null,
            user_id: w.user_id,
            user_name: nameById.get(w.user_id)?.name ?? "",
            user_email: nameById.get(w.user_id)?.email ?? "",
          })),
        };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to load workouts" };
      }
    },
  );

export type AdminWorkoutDetail = AdminWorkoutRow & {
  description_html: string | null;
  instructions_html: string | null;
  tips_html: string | null;
  main_workout: string | null;
  rationale: string | null;
};

export const adminGetWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(
    async ({ context, data }): Promise<{ workout: AdminWorkoutDetail } | { error: string }> => {
      try {
        await assertAdmin(context as any);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: w, error } = await supabaseAdmin
          .from("workouts")
          .select("*")
          .eq("id", data.id)
          .maybeSingle();
        if (error) return { error: error.message };
        if (!w) return { error: "Workout not found" };
        const row = w as any;
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("display_name, email")
          .eq("id", row.user_id)
          .maybeSingle();
        let ownerName = (p as any)?.display_name ?? "";
        let ownerEmail = (p as any)?.email ?? "";
        if (!ownerEmail) {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
          ownerEmail = authUser.user?.email ?? "";
          ownerName =
            ownerName ||
            String(
              authUser.user?.user_metadata?.full_name ?? authUser.user?.user_metadata?.name ?? "",
            );
        }
        return {
          workout: {
            ...row,
            equipment: (row.equipment ?? []) as string[],
            user_name: ownerName,
            user_email: ownerEmail,
          } as AdminWorkoutDetail,
        };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to load workout" };
      }
    },
  );

export const adminGetFreeAccessMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ enabled: boolean } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { isFreeAccessMode } = await import("@/lib/free-access.server");
      return { enabled: await isFreeAccessMode() };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const adminSetFreeAccessMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { enabled: boolean }) => data)
  .handler(async ({ context, data }): Promise<{ enabled: boolean } | { error: string }> => {
    try {
      await assertAdmin(context as any);
      const { setFreeAccessMode } = await import("@/lib/free-access.server");
      return { enabled: await setFreeAccessMode(Boolean(data.enabled)) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed" };
    }
  });

export type AdminBadgeCounts = Record<string, number>;

/**
 * Per-section "needs your attention" counters for the Admin hub.
 * Reports/messages use their own open/unread state; the rest count rows
 * created since the last time this admin opened that section (client-tracked).
 */
export const adminGetSectionBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { seen?: Record<string, string> }) => data ?? {})
  .handler(async ({ context, data }): Promise<{ badges: AdminBadgeCounts }> => {
    try {
      await assertAdmin(context as any);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const seen = data?.seen ?? {};
      const since = (key: string) =>
        seen[key] ?? new Date(Date.now() - 7 * 86_400_000).toISOString();
      const count = (q: any) => q.then((r: any) => r.count ?? 0);

      const [reports, messages, payments, revenue, customers, subscribers, workouts, awards] =
        await Promise.all([
          count(
            supabaseAdmin
              .from("community_reports")
              .select("id", { count: "exact", head: true })
              .eq("status", "open"),
          ),
          count(
            supabaseAdmin
              .from("support_threads")
              .select("id", { count: "exact", head: true })
              .eq("admin_unread", true),
          ),
          count(
            supabaseAdmin
              .from("subscriptions")
              .select("id", { count: "exact", head: true })
              .gt("created_at", since("payments")),
          ),
          count(
            supabaseAdmin
              .from("subscriptions")
              .select("id", { count: "exact", head: true })
              .gt("updated_at", since("revenue")),
          ),
          count(
            supabaseAdmin
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .gt("created_at", since("customers")),
          ),
          count(
            supabaseAdmin
              .from("subscriptions")
              .select("id", { count: "exact", head: true })
              .eq("status", "active")
              .gt("created_at", since("subscribers")),
          ),
          count(
            supabaseAdmin
              .from("workouts")
              .select("id", { count: "exact", head: true })
              .gt("created_at", since("workouts")),
          ),
          count(
            supabaseAdmin
              .from("user_badges")
              .select("id", { count: "exact", head: true })
              .gt("earned_at", since("awards")),
          ),
        ]);

      return {
        badges: { reports, messages, payments, revenue, customers, subscribers, workouts, awards },
      };
    } catch {
      return { badges: {} };
    }
  });
