import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EQUIPMENT, GOALS, LOCATIONS } from "@/lib/coach-options";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Training profile — Smarty Coach" },
      {
        name: "description",
        content: "Your permanent Smarty Coach profile: body stats, experience, goals, equipment and limitations.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  display_name: string | null;
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  experience: string | null;
  fitness_level: string | null;
  primary_goal: string | null;
  secondary_goal: string | null;
  training_frequency: number | null;
  typical_duration_min: number | null;
  preferred_categories: string[] | null;
  preferred_equipment: string[] | null;
  preferred_environment: string | null;
  favorite_exercises: string[] | null;
  disliked_exercises: string[] | null;
  limitations: string[] | null;
};

const EMPTY: Profile = {
  display_name: "",
  age: null,
  gender: "",
  height_cm: null,
  weight_kg: null,
  experience: "intermediate",
  fitness_level: "intermediate",
  primary_goal: "",
  secondary_goal: "",
  training_frequency: 3,
  typical_duration_min: 30,
  preferred_categories: [],
  preferred_equipment: [],
  preferred_environment: "home",
  favorite_exercises: [],
  disliked_exercises: [],
  limitations: [],
};

const LEVELS = ["beginner", "intermediate", "advanced"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Pills({
  options,
  value,
  onToggle,
}: {
  options: Array<{ id: string; label: string }>;
  value: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onToggle(o.id)}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${
            value.includes(o.id)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:border-primary/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function toList(s: string) {
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function ProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      setP({ ...EMPTY, ...((data as unknown as Partial<Profile>) ?? {}) });
    })();
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setP((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggle(key: "preferred_categories" | "preferred_equipment", id: string) {
    setP((prev) => {
      if (!prev) return prev;
      const cur = prev[key] ?? [];
      return { ...prev, [key]: cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id] };
    });
  }

  async function save() {
    if (!p) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ ...p, onboarded: true } as never)
      .eq("id", auth.user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved — Smarty Coach will use this from now on.");
  }

  if (!p)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-black">Training profile</h1>
      <p className="mt-1 text-muted-foreground">
        Smarty Coach remembers this, so you never repeat yourself.
      </p>

      <div className="mt-6 space-y-6 rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              value={p.display_name ?? ""}
              onChange={(e) => set("display_name", e.target.value)}
            />
          </Field>
          <Field label="Age">
            <Input
              type="number"
              value={p.age ?? ""}
              onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="Gender">
            <Input value={p.gender ?? ""} onChange={(e) => set("gender", e.target.value)} />
          </Field>
          <Field label="Height (cm)">
            <Input
              type="number"
              value={p.height_cm ?? ""}
              onChange={(e) => set("height_cm", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="Weight (kg)">
            <Input
              type="number"
              value={p.weight_kg ?? ""}
              onChange={(e) => set("weight_kg", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="Training frequency (per week)">
            <Input
              type="number"
              value={p.training_frequency ?? ""}
              onChange={(e) =>
                set("training_frequency", e.target.value ? Number(e.target.value) : null)
              }
            />
          </Field>
          <Field label="Typical duration (min)">
            <Input
              type="number"
              value={p.typical_duration_min ?? ""}
              onChange={(e) =>
                set("typical_duration_min", e.target.value ? Number(e.target.value) : null)
              }
            />
          </Field>
          <Field label="Fitness level">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={p.fitness_level ?? "intermediate"}
              onChange={(e) => {
                set("fitness_level", e.target.value);
                set("experience", e.target.value);
              }}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Primary goal">
            <Input
              value={p.primary_goal ?? ""}
              onChange={(e) => set("primary_goal", e.target.value)}
              placeholder="e.g. build muscle"
            />
          </Field>
          <Field label="Secondary goal">
            <Input
              value={p.secondary_goal ?? ""}
              onChange={(e) => set("secondary_goal", e.target.value)}
              placeholder="e.g. stay lean"
            />
          </Field>
        </div>

        <Field label="Preferred workout categories">
          <Pills
            options={GOALS.map((g) => ({ id: g.id, label: g.label }))}
            value={p.preferred_categories ?? []}
            onToggle={(id) => toggle("preferred_categories", id)}
          />
        </Field>

        <Field label="Equipment you usually have">
          <Pills
            options={EQUIPMENT.map((e) => ({ id: e.id, label: e.label }))}
            value={p.preferred_equipment ?? []}
            onToggle={(id) => toggle("preferred_equipment", id)}
          />
        </Field>

        <Field label="Usual training environment">
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={p.preferred_environment ?? "home"}
            onChange={(e) => set("preferred_environment", e.target.value)}
          >
            {LOCATIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Favourite exercises (comma separated)">
          <Textarea
            rows={2}
            value={(p.favorite_exercises ?? []).join(", ")}
            onChange={(e) => set("favorite_exercises", toList(e.target.value))}
          />
        </Field>
        <Field label="Exercises you dislike (comma separated)">
          <Textarea
            rows={2}
            value={(p.disliked_exercises ?? []).join(", ")}
            onChange={(e) => set("disliked_exercises", toList(e.target.value))}
          />
        </Field>
        <Field label="Injuries / limitations (comma separated)">
          <Textarea
            rows={2}
            value={(p.limitations ?? []).join(", ")}
            onChange={(e) => set("limitations", toList(e.target.value))}
          />
        </Field>

        <Button size="lg" className="w-full" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save profile
        </Button>
      </div>
    </div>
  );
}
