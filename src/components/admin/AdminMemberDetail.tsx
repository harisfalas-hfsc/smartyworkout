import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, RefreshCw, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminGetMemberDetail, type AdminMemberDetail as Member } from "@/lib/admin.functions";
import { AdminWorkoutsTab } from "@/components/admin/AdminWorkoutsTab";
import { formatDate, formatDateTime } from "@/lib/date-format";

type Props = { userId: string; onBack: () => void };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-primary bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function list(v: string[] | undefined) {
  return v && v.length ? v.join(", ") : "—";
}

export function AdminMemberDetail({ userId, onBack }: Props) {
  const getMember = useServerFn(adminGetMemberDetail);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogbook, setShowLogbook] = useState(false);

  async function load() {
    setLoading(true);
    const r = await getMember({ data: { userId } });
    if ("error" in r) setError(r.error);
    else {
      setMember(r.member);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to members
        </Button>
        <p className="text-sm text-muted-foreground">{error ?? "Member not found."}</p>
      </div>
    );
  }

  const p = member.profile;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to members
        </Button>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
        <Button
          variant={showLogbook ? "default" : "outline"}
          size="sm"
          onClick={() => setShowLogbook((v) => !v)}
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          {showLogbook ? "Hide full logbook" : "Open full logbook"}
        </Button>
      </div>

      <div className="rounded-2xl border-2 border-primary bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{member.name || "No name"}</p>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {member.is_admin && <Badge variant="secondary">Admin</Badge>}
            <Badge variant={member.membership.active ? "default" : "outline"}>
              {member.membership.active ? "Premium" : "Free"}
            </Badge>
            {!member.email_confirmed && <Badge variant="outline">Email unconfirmed</Badge>}
            {p?.wod_mode && <Badge variant="outline">WOD</Badge>}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <span>Joined: {member.joined_at ? formatDate(member.joined_at) : "—"}</span>
          <span>
            Last sign-in: {member.last_sign_in_at ? formatDateTime(member.last_sign_in_at) : "—"}
          </span>
          <span>Credits: {member.membership.credits}</span>
          <span>
            Renews:{" "}
            {member.membership.current_period_end
              ? formatDate(member.membership.current_period_end)
              : "—"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Training profile">
          {p ? (
            <div>
              <Row label="Age" value={p.age} />
              <Row label="Gender" value={p.gender} />
              <Row label="Height" value={p.height_cm ? `${p.height_cm} cm` : null} />
              <Row label="Weight" value={p.weight_kg ? `${p.weight_kg} kg` : null} />
              <Row label="Experience" value={p.experience} />
              <Row label="Fitness level" value={p.fitness_level} />
              <Row label="Primary goal" value={p.primary_goal} />
              <Row label="Secondary goal" value={p.secondary_goal} />
              <Row
                label="Frequency"
                value={p.training_frequency ? `${p.training_frequency} / week` : null}
              />
              <Row
                label="Typical session"
                value={p.typical_duration_min ? `${p.typical_duration_min} min` : null}
              />
              <Row label="Environment" value={p.preferred_environment} />
              <Row label="Categories" value={list(p.preferred_categories)} />
              <Row label="Equipment" value={list(p.preferred_equipment)} />
              <Row label="Limitations" value={list(p.limitations)} />
              <Row label="Library preferences" value={p.use_library_preferences ? "On" : "Off"} />
              <Row label="Timezone" value={p.timezone} />
              <Row
                label="Health waiver"
                value={p.health_acknowledged_at ? formatDate(p.health_acknowledged_at) : "Not signed"}
              />
              <Row label="Profile updated" value={p.updated_at ? formatDate(p.updated_at) : null} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">This member has no training profile yet.</p>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Activity">
            <Row label="Workouts created" value={member.totals.workouts} />
            <Row label="Completed" value={member.totals.completed} />
            <Row label="Scheduled" value={member.totals.scheduled} />
            <Row label="Favorites" value={member.totals.favorites} />
            <Row label="Shared to community" value={member.totals.shared} />
            <Row label="Sets logged" value={member.totals.logged_sets} />
            <Row
              label="Last workout"
              value={member.totals.last_workout_at ? formatDateTime(member.totals.last_workout_at) : null}
            />
            <Row
              label="Last completed"
              value={
                member.totals.last_completed_at ? formatDateTime(member.totals.last_completed_at) : null
              }
            />
          </Card>

          <Card title="Progress">
            {member.progress ? (
              <div>
                <Row label="Score" value={member.progress.score} />
                <Row label="Current streak" value={`${member.progress.current_streak} days`} />
                <Row label="Longest streak" value={`${member.progress.longest_streak} days`} />
                <Row label="Active days" value={member.progress.active_days} />
                <Row label="Badge points" value={member.progress.badge_points} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No progress recorded yet.</p>
            )}
            {member.badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {member.badges.slice(0, 12).map((b) => (
                  <Badge key={b.id} variant="outline" className="text-[11px]">
                    {b.name}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card title={`Workout history (${member.history.length} most recent)`}>
        {member.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workouts yet.</p>
        ) : (
          <div className="space-y-2">
            {member.history.map((h) => (
              <div key={h.id} className="rounded-xl border border-border bg-background/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.category}
                      {h.format ? ` · ${h.format}` : ""}
                      {h.focus ? ` · ${h.focus}` : ""} · {h.duration_min} min ·{" "}
                      {"★".repeat(h.difficulty_stars || 0)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {h.is_wod && <Badge variant="outline">WOD</Badge>}
                    <Badge variant={h.status === "completed" ? "default" : "outline"}>
                      {h.status}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground sm:grid-cols-4">
                  <span>Created: {formatDate(h.created_at)}</span>
                  <span>Done: {h.completed_at ? formatDate(h.completed_at) : "—"}</span>
                  <span>RPE: {h.rpe ?? "—"}</span>
                  <span>Felt: {h.feeling ?? h.difficulty_rating ?? "—"}</span>
                </div>
                {(h.comment || h.result_note) && (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    {h.comment ?? h.result_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {showLogbook && (
        <AdminWorkoutsTab userId={member.id} title={`Full logbook — ${member.name || member.email}`} />
      )}
    </div>
  );
}
