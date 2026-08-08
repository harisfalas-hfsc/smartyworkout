import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  User,
  Gauge,
  Target,
  LayoutGrid,
  Dumbbell,
  MapPin,
  Heart,
  ThumbsDown,
  ShieldAlert,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { EQUIPMENT, GOALS, LOCATIONS } from "@/lib/coach-options";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Training profile — Smarty Coach" },
      {
        name: "description",
        content:
          "Your permanent Smarty Coach profile: body stats, experience, goals, equipment and limitations.",
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
  health_acknowledged_at: string | null;
  onboarded: boolean;
  readiness_answers: Record<string, boolean>;
  readiness_warning_acknowledged_at: string | null;
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
  health_acknowledged_at: null,
  onboarded: false,
  readiness_answers: {},
  readiness_warning_acknowledged_at: null,
};

const LEVELS = ["beginner", "intermediate", "advanced"];

function SectionCard({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold leading-tight">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onToggle(o.id)}
          className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
            value.includes(o.id)
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-background hover:border-primary/50"
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
  const navigate = useNavigate();
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

  function answerReadiness(key: string, value: boolean) {
    setP((prev) =>
      prev
        ? {
            ...prev,
            readiness_answers: { ...(prev.readiness_answers ?? {}), [key]: value },
            readiness_warning_acknowledged_at: value
              ? prev.readiness_warning_acknowledged_at
              : null,
          }
        : prev,
    );
  }

  async function save() {
    if (!p) return;
    const missing = [
      !p.display_name?.trim() && "name",
      !p.age && "age",
      !p.fitness_level && "fitness level",
      !p.primary_goal?.trim() && "primary goal",
      !p.preferred_environment && "training environment",
      !(p.preferred_equipment?.length) && "available equipment",
      !p.typical_duration_min && "workout duration",
      !p.health_acknowledged_at && "health acknowledgement",
      Object.keys(p.readiness_answers ?? {}).length < 5 && "readiness questionnaire",
      Object.values(p.readiness_answers ?? {}).some(Boolean) &&
        !p.readiness_warning_acknowledged_at &&
        "readiness warning acknowledgement",
    ].filter(Boolean);
    if (missing.length) {
      toast.error(`Complete: ${missing.join(", ")}.`);
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ ...p, onboarded: true } as never)
      .eq("id", auth.user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile complete — Smarty Coach can now personalize your workouts.");
      navigate({ to: "/pricing" });
    }
  }

  if (!p)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const selectClass =
    "h-12 w-full rounded-2xl border border-input bg-background px-3 text-sm font-medium";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Your profile
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Training profile</h1>
        <p className="mt-2 text-muted-foreground">
          Smarty Coach reads every field below before it builds a workout.
        </p>
      </div>

      <div className="space-y-4">
        <SectionCard icon={User} title="About you" hint="Basic biometrics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                className="h-12 rounded-2xl"
                value={p.display_name ?? ""}
                onChange={(e) => set("display_name", e.target.value)}
              />
            </Field>
            <Field label="Age">
              <Input
                className="h-12 rounded-2xl"
                type="number"
                value={p.age ?? ""}
                onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
            <Field label="Gender">
              <Input
                className="h-12 rounded-2xl"
                value={p.gender ?? ""}
                onChange={(e) => set("gender", e.target.value)}
              />
            </Field>
            <Field label="Height (cm)">
              <Input
                className="h-12 rounded-2xl"
                type="number"
                value={p.height_cm ?? ""}
                onChange={(e) => set("height_cm", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
            <Field label="Weight (kg)">
              <Input
                className="h-12 rounded-2xl"
                type="number"
                value={p.weight_kg ?? ""}
                onChange={(e) => set("weight_kg", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={Gauge} title="Fitness level" hint="Sets the difficulty of every session">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Level">
              <select
                className={selectClass}
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
            <Field label="Sessions per week">
              <Input
                className="h-12 rounded-2xl"
                type="number"
                value={p.training_frequency ?? ""}
                onChange={(e) =>
                  set("training_frequency", e.target.value ? Number(e.target.value) : null)
                }
              />
            </Field>
            <Field label="Typical duration (min)">
              <Input
                className="h-12 rounded-2xl"
                type="number"
                value={p.typical_duration_min ?? ""}
                onChange={(e) =>
                  set("typical_duration_min", e.target.value ? Number(e.target.value) : null)
                }
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={Target} title="Your goals">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary goal">
              <Input
                className="h-12 rounded-2xl"
                value={p.primary_goal ?? ""}
                onChange={(e) => set("primary_goal", e.target.value)}
                placeholder="e.g. build muscle"
              />
            </Field>
            <Field label="Secondary goal">
              <Input
                className="h-12 rounded-2xl"
                value={p.secondary_goal ?? ""}
                onChange={(e) => set("secondary_goal", e.target.value)}
                placeholder="e.g. stay lean"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={LayoutGrid}
          title="Preferred workout categories"
          hint="Used for Surprise Me and weekly balance"
        >
          <Pills
            options={GOALS.map((g) => ({ id: g.id, label: g.label }))}
            value={p.preferred_categories ?? []}
            onToggle={(id) => toggle("preferred_categories", id)}
          />
        </SectionCard>

        <SectionCard
          icon={Dumbbell}
          title="Equipment you usually use"
          hint="Nothing outside this list will be programmed"
        >
          <Pills
            options={EQUIPMENT.map((e) => ({ id: e.id, label: e.label }))}
            value={p.preferred_equipment ?? []}
            onToggle={(id) => toggle("preferred_equipment", id)}
          />
        </SectionCard>

        <SectionCard icon={MapPin} title="Usual training environment">
          <select
            className={selectClass}
            value={p.preferred_environment ?? "home"}
            onChange={(e) => set("preferred_environment", e.target.value)}
          >
            {LOCATIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </SectionCard>

        <SectionCard
          icon={Heart}
          title="Favourite exercises"
          hint="Comma separated — Smarty Coach will prioritise these"
        >
          <Textarea
            className="rounded-2xl"
            rows={2}
            value={(p.favorite_exercises ?? []).join(", ")}
            onChange={(e) => set("favorite_exercises", toList(e.target.value))}
          />
        </SectionCard>

        <SectionCard
          icon={Activity}
          title="Readiness questionnaire"
          hint="Mandatory before any workout can be created"
        >
          <div className="space-y-3">
            {[
              ["heart", "Has a doctor ever said you have a heart condition or should only exercise under medical supervision?"],
              ["chestPain", "Do you feel chest pain during physical activity or at rest?"],
              ["dizziness", "Do you lose balance because of dizziness or ever lose consciousness?"],
              ["jointProblem", "Do you have a bone, joint or soft-tissue problem that exercise could worsen?"],
              ["otherReason", "Is there any other reason you should not exercise today?"],
            ].map(([key, question]) => (
              <div key={key} className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm font-semibold leading-5">{question}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[false, true].map((value) => (
                    <Button
                      key={String(value)}
                      type="button"
                      variant={p.readiness_answers?.[key] === value ? "default" : "outline"}
                      className="h-11 rounded-xl"
                      onClick={() => answerReadiness(key, value)}
                    >
                      {value ? "Yes" : "No"}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {Object.values(p.readiness_answers ?? {}).some(Boolean) ? (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm leading-5">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                checked={Boolean(p.readiness_warning_acknowledged_at)}
                onChange={(event) =>
                  set(
                    "readiness_warning_acknowledged_at",
                    event.target.checked ? new Date().toISOString() : null,
                  )
                }
              />
              <span>
                A response indicates exercise may not be appropriate without professional advice. I have read this warning, understand the risk, and choose to continue.
              </span>
            </label>
          ) : null}
        </SectionCard>

        <SectionCard
          icon={CheckCircle2}
          title="Health & safety acknowledgement"
          hint="Required before Smarty Coach can create any workout"
        >
          <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4 text-sm leading-5">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
              checked={Boolean(p.health_acknowledged_at)}
              onChange={(event) =>
                set("health_acknowledged_at", event.target.checked ? new Date().toISOString() : null)
              }
            />
            <span>
              I understand this is not medical advice. I choose to continue and will stop if I feel pain, dizziness or unusual symptoms.
            </span>
          </label>
        </SectionCard>

        <SectionCard
          icon={ThumbsDown}
          title="Exercises you dislike"
          hint="Comma separated — these will never appear"
        >
          <Textarea
            className="rounded-2xl"
            rows={2}
            value={(p.disliked_exercises ?? []).join(", ")}
            onChange={(e) => set("disliked_exercises", toList(e.target.value))}
          />
        </SectionCard>

        <SectionCard
          icon={ShieldAlert}
          title="Injuries & limitations"
          hint="Comma separated — always respected when building your workout"
        >
          <Textarea
            className="rounded-2xl"
            rows={2}
            value={(p.limitations ?? []).join(", ")}
            onChange={(e) => set("limitations", toList(e.target.value))}
          />
        </SectionCard>
      </div>

      <div className="sticky bottom-4 mt-6">
        <Button
          size="lg"
          className="h-16 w-full rounded-2xl text-base font-extrabold shadow-lg"
          onClick={save}
          disabled={saving}
        >
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          Save profile
        </Button>
      </div>
    </div>
  );
}
