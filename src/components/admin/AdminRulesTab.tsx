import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminGetSettings, adminSaveRules } from "@/lib/admin.functions";
import type { WorkoutRules } from "@/lib/settings.server";

export function AdminRulesTab() {
  const getSettings = useServerFn(adminGetSettings);
  const saveRules = useServerFn(adminSaveRules);
  const [rules, setRules] = useState<WorkoutRules | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await getSettings({ data: {} } as never);
      if ("error" in r) setMessage(r.error);
      else setRules(r.rules);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rules) {
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

  async function save() {
    if (!rules) return;
    setBusy(true);
    const r = await saveRules({ data: rules });
    setBusy(false);
    if ("error" in r) setMessage(r.error);
    else {
      setRules(r.rules);
      setMessage("Saved. New workouts use these rules immediately.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-2xl border-2 border-blue-400 bg-card p-4">
        <div>
          <Label htmlFor="limit">Coach generations per day</Label>
          <Input
            id="limit"
            type="number"
            min={0}
            max={20}
            value={rules.dailyGenerationLimit}
            onChange={(e) =>
              setRules({ ...rules, dailyGenerationLimit: Number(e.target.value) })
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Workout of the Day never counts against this allowance.
          </p>
        </div>

        <div>
          <Label htmlFor="price">Membership price (EUR / month)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min={0}
            value={rules.membershipPriceEur}
            onChange={(e) => setRules({ ...rules, membershipPriceEur: Number(e.target.value) })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Used for monthly recurring revenue estimates in this panel.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Workout of the Day active</p>
            <p className="text-xs text-muted-foreground">Pauses all daily generation when off.</p>
          </div>
          <Switch
            checked={rules.wodEnabled}
            onCheckedChange={(v) => setRules({ ...rules, wodEnabled: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Two daily variants</p>
            <p className="text-xs text-muted-foreground">
              Bodyweight plus equipment. Off means one equipment workout a day.
            </p>
          </div>
          <Switch
            checked={rules.wodTwoVariants}
            onCheckedChange={(v) => setRules({ ...rules, wodTwoVariants: v })}
          />
        </div>
      </div>

      <div className="rounded-2xl border-2 border-blue-400 bg-card p-4">
        <Label htmlFor="extra">Extra coaching rules</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Added to every generation with the highest priority. Example: never program box jumps.
        </p>
        <Textarea
          id="extra"
          rows={6}
          value={rules.extraCoachRules}
          onChange={(e) => setRules({ ...rules, extraCoachRules: e.target.value })}
          placeholder="One rule per line"
        />
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <Button onClick={() => void save()} disabled={busy} className="w-full">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save rules
      </Button>
    </div>
  );
}
