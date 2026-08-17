import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminListBadgeDefs,
  adminSaveBadgeDef,
  adminGetUserProgress,
  type BadgeDef,
  type AdminUserProgress,
} from "@/lib/progress.functions";

const CATEGORIES = ["completed", "generated", "streak", "subscription"];

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-normal text-foreground"
      />
    </label>
  );
}

export function AdminAwardsTab() {
  const list = useServerFn(adminListBadgeDefs);
  const save = useServerFn(adminSaveBadgeDef);
  const getProgress = useServerFn(adminGetUserProgress);
  const [defs, setDefs] = useState<BadgeDef[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [progress, setProgress] = useState<AdminUserProgress | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);

  useEffect(() => {
    void list({ data: {} } as never).then((r) => setDefs(r.definitions));
  }, [list]);

  function patch(id: string, key: keyof BadgeDef, value: unknown) {
    setDefs((prev) =>
      (prev ?? []).map((d) => (d.id === id ? ({ ...d, [key]: value } as BadgeDef) : d)),
    );
  }

  async function persist(def: BadgeDef) {
    setSavingId(def.id);
    await save({ data: def } as never);
    setSavingId(null);
  }

  function addBadge() {
    const id = `custom_${Date.now()}`;
    setDefs((prev) => [
      ...(prev ?? []),
      {
        id,
        category: "completed",
        name: "New badge",
        description: "",
        threshold: 5000,
        icon: "trophy",
        points: 100,
        sort_order: 999,
        is_active: true,
      },
    ]);
  }

  async function lookup() {
    setProgressError(null);
    setProgress(null);
    const r = await getProgress({ data: { userId: userId.trim() } } as never);
    if ("error" in r) setProgressError(r.error);
    else setProgress(r);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-blue-400 bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Badge definitions</h3>
          <Button size="sm" variant="outline" onClick={addBadge}>
            <Plus className="mr-1 h-4 w-4" /> New badge
          </Button>
        </div>
        {!defs ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {defs.map((d) => (
              <div key={d.id} className="rounded-xl border border-border p-3">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <Field label="Name" value={d.name} onChange={(v) => patch(d.id, "name", v)} />
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Category
                    <select
                      value={d.category}
                      onChange={(e) => patch(d.id, "category", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-normal text-foreground"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Threshold"
                    type="number"
                    value={d.threshold}
                    onChange={(v) => patch(d.id, "threshold", Number(v))}
                  />
                  <Field
                    label="Points"
                    type="number"
                    value={d.points}
                    onChange={(v) => patch(d.id, "points", Number(v))}
                  />
                  <Field label="Icon" value={d.icon} onChange={(v) => patch(d.id, "icon", v)} />
                  <Field
                    label="Order"
                    type="number"
                    value={d.sort_order}
                    onChange={(v) => patch(d.id, "sort_order", Number(v))}
                  />
                  <Field
                    label="Description"
                    value={d.description}
                    onChange={(v) => patch(d.id, "description", v)}
                  />
                  <label className="flex items-end gap-2 text-xs font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={d.is_active}
                      onChange={(e) => patch(d.id, "is_active", e.target.checked)}
                    />
                    Active
                  </label>
                </div>
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={savingId === d.id}
                  onClick={() => void persist(d)}
                >
                  {savingId === d.id ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-blue-400 bg-card p-4">
        <h3 className="font-bold">Member progress</h3>
        <div className="mt-3 flex gap-2">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <Button onClick={() => void lookup()} disabled={!userId.trim()}>
            <Search className="mr-1 h-4 w-4" /> Look up
          </Button>
        </div>
        {progressError && <p className="mt-3 text-sm text-muted-foreground">{progressError}</p>}
        {progress && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="font-semibold">{progress.email ?? progress.stats.score}</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                ["Score", progress.stats.score],
                ["Rank", `#${progress.rank}`],
                ["Generated", progress.stats.workouts_generated],
                ["Completed", progress.stats.workouts_completed],
                ["Current streak", `${progress.stats.current_streak}d`],
                ["Longest streak", `${progress.stats.longest_streak}d`],
                ["Membership", `${progress.stats.subscription_months} mo`],
                ["Awards", progress.badges.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-border p-3">
                  <p className="text-xs uppercase text-muted-foreground">{label}</p>
                  <p className="text-lg font-extrabold">{String(value)}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Achievement history</p>
              <ul className="mt-1 space-y-1">
                {progress.badges.map((b) => (
                  <li key={b.badge_id}>
                    {b.badge_name} — {new Date(b.earned_at).toLocaleDateString()}
                  </li>
                ))}
                {!progress.badges.length && <li className="text-muted-foreground">No awards yet</li>}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
