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
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  MessagesSquare,
  Trophy,
  Flag,
  ArrowLeft,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { isAdminEmail } from "@/lib/admin";
import {
  adminGetStats,
  adminGetSectionBadges,
  type AdminStats,
  type AdminBadgeCounts,
} from "@/lib/admin.functions";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminRevenueTab } from "@/components/admin/AdminRevenueTab";
import { AdminRulesTab } from "@/components/admin/AdminRulesTab";
import { AdminCycleTab } from "@/components/admin/AdminCycleTab";
import { AdminWorkoutsTab } from "@/components/admin/AdminWorkoutsTab";
import { AdminMessagesTab } from "@/components/admin/AdminMessagesTab";
import { AdminAwardsTab } from "@/components/admin/AdminAwardsTab";
import { AdminReportsTab } from "@/components/admin/AdminReportsTab";
import { AdminPaymentsTab } from "@/components/admin/AdminPaymentsTab";
import { AdminCronTab } from "@/components/admin/AdminCronTab";

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

type SectionKey =
  | "customers"
  | "subscribers"
  | "revenue"
  | "rules"
  | "cycle"
  | "workouts"
  | "messages"
  | "awards"
  | "reports"
  | "payments"
  | "cron";

const SECTIONS: { key: SectionKey; label: string; description: string; Icon: LucideIcon }[] = [
  {
    key: "payments",
    label: "Payments",
    description: "Global Free Access Mode master switch",
    Icon: Lock,
  },
  { key: "revenue", label: "Revenue", description: "Payments and monthly totals", Icon: TrendingUp },
  {
    key: "workouts",
    label: "Workouts",
    description: "Every workout ever generated",
    Icon: ClipboardList,
  },
  {
    key: "messages",
    label: "Messages",
    description: "Member messages and announcements",
    Icon: MessagesSquare,
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
    key: "awards",
    label: "Awards",
    description: "Badges, thresholds and member progress",
    Icon: Trophy,
  },
  {
    key: "reports",
    label: "Community reports",
    description: "Moderate shared workouts and comments",
    Icon: Flag,
  },
  {
    key: "cron",
    label: "Cron jobs",
    description: "Automated jobs, times, content and history",
    Icon: CalendarClock,
  },
  {
    key: "cycle",
    label: "Workout of the Day",
    description: "84 day periodization calendar",
    Icon: CalendarDays,
  },
];

const SEEN_PREFIX = "smarty-admin-seen-";

function readSeen(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  for (const { key } of SECTIONS) {
    const v = window.localStorage.getItem(SEEN_PREFIX + key);
    if (v) out[key] = v;
  }
  return out;
}

function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [section, setSection] = useState<SectionKey | null>(null);
  const { badges, markSeen } = useAdminBadges(authed === true, section);
  const unreadMessages = badges.messages ?? 0;

  useEffect(() => {
    let active = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active) setAuthed(isAdminEmail(data.user?.email ?? null));
      })
      .catch(() => {
        if (active) setAuthed(false);
      });
    return () => {
      active = false;
    };
  }, []);


  function openSection(key: SectionKey) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SEEN_PREFIX + key, new Date().toISOString());
    }
    markSeen(key);
    setSection(key);
  }

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
        <div className="mx-auto mt-10 max-w-sm rounded-3xl border-2 border-blue-400 bg-card p-6 text-center shadow-sm">
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
        <div className="min-w-0 max-w-full space-y-4 overflow-x-clip">
          <Button variant="ghost" size="sm" onClick={() => setSection(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> All sections
          </Button>
          {section === "payments" && <AdminPaymentsTab />}
          {section === "revenue" && <AdminRevenueTab />}
          {section === "customers" && <AdminUsersTab />}
          {section === "subscribers" && <AdminUsersTab onlySubscribers />}
          {section === "rules" && <AdminRulesTab />}
          {section === "cycle" && <AdminCycleTab />}
          {section === "workouts" && <AdminWorkoutsTab />}
          {section === "messages" && <AdminMessagesTab />}
          {section === "awards" && <AdminAwardsTab />}
          {section === "reports" && <AdminReportsTab />}
          {section === "cron" && <AdminCronTab />}
        </div>
      ) : (
        <AdminHub onOpen={openSection} unreadMessages={unreadMessages} badges={badges} />
      )}
    </Shell>
  );
}

function useAdminBadges(enabled: boolean, section: SectionKey | null) {
  const getBadges = useServerFn(adminGetSectionBadges);
  const [badges, setBadges] = useState<AdminBadgeCounts>({});

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const tick = () => {
      void getBadges({ data: { seen: readSeen() } })
        .then((r) => {
          if (active) setBadges(r.badges);
        })
        .catch(() => undefined);
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [enabled, section, getBadges]);

  const markSeen = (key: SectionKey) =>
    setBadges((prev) => ({ ...prev, [key]: key === "messages" ? prev[key] ?? 0 : 0 }));

  return { badges, markSeen };
}


function AdminHub({
  onOpen,
  unreadMessages,
  badges,
}: {
  onOpen: (key: SectionKey) => void;
  unreadMessages: number;
  badges: AdminBadgeCounts;
}) {
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

      {unreadMessages > 0 && (
        <button
          type="button"
          onClick={() => onOpen("messages")}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-blue-400 bg-primary/10 p-4 text-left"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <MessagesSquare className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold">
              {unreadMessages} unread {unreadMessages === 1 ? "message" : "messages"}
            </span>
            <span className="block text-xs text-muted-foreground">
              Tap to open the Messages section and reply
            </span>
          </span>
        </button>
      )}

      {error && <p className="text-sm text-muted-foreground">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {SECTIONS.map(({ key, label, description, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onOpen(key)}
            className="relative flex min-h-[112px] flex-col items-start gap-2 rounded-2xl border-2 border-blue-400 bg-card p-4 text-left transition hover:bg-accent"
          >
            {(badges[key] ?? 0) > 0 && (
              <span className="absolute right-3 top-3 grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">
                {(badges[key] ?? 0) > 99 ? "99+" : badges[key]}
              </span>
            )}
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="font-semibold">{label}</span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </button>
        ))}
        <Link
          to="/admin/exercise-library"
          className="flex min-h-[112px] flex-col items-start gap-2 rounded-2xl border-2 border-blue-400 bg-card p-4 text-left transition hover:bg-accent"
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
    <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
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
      <main className="mx-auto w-full min-w-0 max-w-[1100px] overflow-x-clip px-4 pb-24 pt-6 lg:max-w-6xl lg:px-8">{children}</main>
    </div>
  );
}
