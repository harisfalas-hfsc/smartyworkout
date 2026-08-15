import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldAlert,
  Users,
  Crown,
  TrendingUp,
  Loader2,
  SlidersHorizontal,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { isAdminEmail } from "@/lib/admin";
import { adminGetStats, type AdminStats } from "@/lib/admin.functions";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminRevenueTab } from "@/components/admin/AdminRevenueTab";
import { AdminRulesTab } from "@/components/admin/AdminRulesTab";
import { AdminCycleTab } from "@/components/admin/AdminCycleTab";
import { AdminWorkoutsTab } from "@/components/admin/AdminWorkoutsTab";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin | Smarty Workout" },
      { name: "description", content: "Administration panel for Smarty Workout." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin | Smarty Workout" },
      { property: "og:description", content: "Administration panel for Smarty Workout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type SectionKey = "customers" | "subscribers" | "revenue" | "rules" | "cycle" | "workouts";

const SECTIONS: { key: SectionKey; label: string; description: string; Icon: LucideIcon }[] = [
  { key: "revenue", label: "Revenue", description: "Payments and monthly totals", Icon: TrendingUp },
  {
    key: "workouts",
    label: "Workouts",
    description: "Every workout ever generated",
    Icon: ClipboardList,
  },
  { key: "customers", label: "Customers", description: "Search, grant, revoke, promote", Icon: Users },
  { key: "subscribers", label: "Subscribers", description: "Active memberships only", Icon: Crown },
  {
    key: "rules",
    label: "Workout rules",
    description: "Limits, pricing, coaching rules",
    Icon: SlidersHorizontal,
  },
  {
    key: "cycle",
    label: "Workout of the Day",
    description: "84 day periodization calendar",
    Icon: CalendarDays,
  },
];

function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [section, setSection] = useState<SectionKey | null>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setAuthed(isAdminEmail(data.user?.email)))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <Shell>
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (!authed) {
    return (
      <Shell>
        <div className="mx-auto mt-10 max-w-sm rounded-3xl border border-blue-400 bg-card p-6 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold">Admin access only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This area is restricted to Smarty Workout administrators.
          </p>
        </div>
      </Shell>
    );
  }

  const active = SECTIONS.find((s) => s.key === section);

  return (
    <Shell>
      <PageHeader
        eyebrow="Administration"
        title={active ? active.label : "Admin panel"}
        subtitle={active ? active.description : "Everything that runs Smarty Workout"}
      />

      {section ? (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSection(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> All sections
          </Button>
          {section === "revenue" && <AdminRevenueTab />}
          {section === "customers" && <AdminUsersTab />}
          {section === "subscribers" && <AdminUsersTab onlySubscribers />}
          {section === "rules" && <AdminRulesTab />}
          {section === "cycle" && <AdminCycleTab />}
          {section === "workouts" && <AdminWorkoutsTab />}
        </div>
      ) : (
        <AdminHub onOpen={setSection} />
      )}
    </Shell>
  );
}

function AdminHub({ onOpen }: { onOpen: (key: SectionKey) => void }) {
  const getStats = useServerFn(adminGetStats);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await getStats({ data: {} } as never);
      if ("error" in r) setError(r.error);
      else setStats(r.stats);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Members" value={stats?.totalUsers} />
        <Stat label="Premium" value={stats?.activeSubscribers} />
        <Stat label="MRR (EUR)" value={stats?.mrrEur} />
        <Stat label="New (30d)" value={stats?.newUsers30d} />
        <Stat label="Workouts" value={stats?.workoutsTotal} />
        <Stat label="Today" value={stats?.workoutsToday} />
        <Stat label="Completed" value={stats?.workoutsCompleted} />
        <Stat label="WOD members" value={stats?.wodSubscribers} />
      </div>

      {error && <p className="text-sm text-muted-foreground">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {SECTIONS.map(({ key, label, description, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onOpen(key)}
            className="flex min-h-[112px] flex-col items-start gap-2 rounded-2xl border border-blue-400 bg-card p-4 text-left transition hover:bg-accent"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="font-semibold">{label}</span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </button>
        ))}
        <Link
          to="/admin/exercise-library"
          className="flex min-h-[112px] flex-col items-start gap-2 rounded-2xl border border-blue-400 bg-card p-4 text-left transition hover:bg-accent"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Dumbbell className="h-5 w-5" />
          </span>
          <span className="font-semibold">Exercise library</span>
          <span className="text-xs text-muted-foreground">Upload and manage exercises</span>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl border border-blue-400 bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">
        {value === undefined ? "—" : value.toLocaleString()}
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background text-foreground">
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-6 lg:px-8">{children}</main>
    </div>
  );
}
