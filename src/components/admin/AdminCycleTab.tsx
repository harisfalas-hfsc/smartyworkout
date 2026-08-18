import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminGetSettings, adminSaveCycleDay, type AdminCycleDay } from "@/lib/admin.functions";
import type { Category } from "@/lib/workout/spec";

const CATEGORIES: Category[] = [
  "STRENGTH",
  "CALORIE BURNING",
  "METABOLIC",
  "CARDIO",
  "MOBILITY & STABILITY",
  "CHALLENGE",
  "PILATES",
  "RECOVERY",
  "MICRO-WORKOUTS",
];

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Recovery"] as const;

export function AdminCycleTab() {
  const getSettings = useServerFn(adminGetSettings);
  const saveDay = useServerFn(adminSaveCycleDay);
  const [cycle, setCycle] = useState<AdminCycleDay[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyDay, setBusyDay] = useState<number | null>(null);
  const [block, setBlock] = useState(1);

  async function load() {
    const r = await getSettings({ data: {} } as never);
    if ("error" in r) setMessage(r.error);
    else setCycle(r.cycle);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function update(
    day: number,
    patch: { category?: Category; difficulty?: string | null; reset?: boolean },
  ) {
    setBusyDay(day);
    const payload =
      patch.reset === true
        ? { day, reset: true }
        : {
            day,
            ...(patch.category ? { category: patch.category } : {}),
            ...(patch.difficulty !== undefined
              ? {
                  difficulty:
                    patch.difficulty === "Recovery" || patch.difficulty === null
                      ? null
                      : (patch.difficulty as "Beginner" | "Intermediate" | "Advanced"),
                }
              : {}),
          };
    const r = await saveDay({ data: payload as never });
    setBusyDay(null);
    if ("error" in r) setMessage(r.error);
    else {
      setMessage(null);
      await load();
    }
  }

  if (!cycle) {
    return (
      <div className="flex justify-center py-10">
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        )}
      </div>
    );
  }

  const days = cycle.filter((d) => Math.ceil(d.day / 28) === block);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        The 84 day periodization calendar. Everyone gets the same category and difficulty on the
        same date. Changes apply to workouts generated from now on.
      </p>

      <div className="flex gap-2">
        {[1, 2, 3].map((b) => (
          <Button
            key={b}
            size="sm"
            variant={block === b ? "default" : "outline"}
            onClick={() => setBlock(b)}
          >
            Block {b}
          </Button>
        ))}
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <div className="grid gap-3 lg:grid-cols-2">
        {days.map((d) => (
          <div key={d.day} className="rounded-2xl border-2 border-blue-400 bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Day {d.day}</p>
              <div className="flex items-center gap-2">
                {d.overridden && <Badge variant="secondary">Edited</Badge>}
                {busyDay === d.day && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {d.overridden && (
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Reset to default"
                    onClick={() => void update(d.day, { reset: true })}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Select
                value={d.category}
                onValueChange={(v) => void update(d.day, { category: v as Category })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={d.difficulty ?? "Recovery"}
                onValueChange={(v) => void update(d.day, { difficulty: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {d.stars ? `${d.stars[0]}-${d.stars[1]} stars` : "Recovery day"}
              {d.strengthFocus ? ` · ${d.strengthFocus}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
