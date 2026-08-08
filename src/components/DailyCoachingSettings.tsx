import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDailyHub, saveDailySettings, type DailySettings } from "@/lib/daily.functions";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ZONES = [
  "Europe/Athens",
  "Europe/Nicosia",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Lisbon",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Australia/Sydney",
];

function hourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

export function DailyCoachingSettings({ premium = false }: { premium?: boolean }) {
  const load = useServerFn(getDailyHub);
  const save = useServerFn(saveDailySettings);
  const [settings, setSettings] = useState<DailySettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load({})
      .then((hub) => setSettings(hub.settings))
      .catch(() => undefined);
  }, [load]);

  function patch(next: Partial<DailySettings>) {
    setSettings((prev) => (prev ? { ...prev, ...next } : prev));
  }

  async function commit() {
    if (!settings || saving) return;
    setSaving(true);
    try {
      await save({ data: settings });
      toast.success("Daily coaching saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <section className="mt-4 grid h-32 place-items-center rounded-2xl border border-border bg-card">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <BellRing className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold">Daily coaching</p>
          <p className="text-sm text-muted-foreground">Messages, delivery time and WOD mode.</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Morning motivation</p>
            <p className="text-xs text-muted-foreground">
              One short message from Smarty Coach each morning.
            </p>
          </div>
          <Switch
            checked={settings.notify_motivation}
            onCheckedChange={(v) => patch({ notify_motivation: v })}
          />
        </div>

        {settings.notify_motivation ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">Send it at</p>
            <Select
              value={String(settings.motivation_hour)}
              onValueChange={(v) => patch({ motivation_hour: Number(v) })}
            >
              <SelectTrigger className="h-10 w-28 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {hourLabel(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {premium ? (
          <>
            <div className="h-px bg-border" />

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Workout ready every day</p>
                <p className="text-xs text-muted-foreground">
                  Smarty Coach builds your session before you ask for it.
                </p>
              </div>
              <Switch
                checked={settings.auto_workout_enabled}
                onCheckedChange={(v) => patch({ auto_workout_enabled: v })}
              />
            </div>

            {settings.auto_workout_enabled ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm">Have it ready by</p>
                <Select
                  value={String(settings.auto_workout_hour)}
                  onValueChange={(v) => patch({ auto_workout_hour: Number(v) })}
                >
                  <SelectTrigger className="h-10 w-28 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {hourLabel(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </>
        ) : null}


        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">Time zone</p>
          <Select value={settings.timezone} onValueChange={(v) => patch({ timezone: v })}>
            <SelectTrigger className="h-10 w-44 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(ZONES.includes(settings.timezone) ? ZONES : [settings.timezone, ...ZONES]).map(
                (z) => (
                  <SelectItem key={z} value={z}>
                    {z.replace("_", " ")}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

      </div>

      <Button className="mt-5 h-12 w-full rounded-2xl" disabled={saving} onClick={() => void commit()}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save daily coaching
      </Button>
    </section>
  );
}
