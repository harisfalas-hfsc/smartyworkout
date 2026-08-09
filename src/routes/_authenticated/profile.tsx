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
import {
  EQUIPMENT,
  GOALS,
  LOCATIONS,
  GENDERS,
  FITNESS_LEVELS,
  SESSIONS_PER_WEEK,
  DURATIONS,
  PROFILE_GOALS,
  MOVEMENT_DISLIKES,
  LIMITATIONS,
} from "@/lib/coach-options";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";


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

function ProfilePage() {
  const navigate = useNavigate();
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wasOnboarded, setWasOnboarded] = useState(false);


  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      const incoming = (data as unknown as Partial<Profile>) ?? {};
      // Drop nulls so dropdown defaults in EMPTY stay in sync with what is displayed.
      const clean = Object.fromEntries(
        Object.entries(incoming).filter(
          ([k, v]) =>
            v !== null &&
            v !== undefined &&
            !(v === "" && k !== "display_name" && k !== "secondary_goal"),
        ),
      ) as Partial<Profile>;

      const row = { ...EMPTY, ...clean };
      setWasOnboarded(Boolean(row.onboarded));
      setP(row);

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

  function toggleList(
    key: "favorite_exercises" | "disliked_exercises" | "limitations",
    id: string,
  ) {
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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Training profile saved.");
    setSaved(true);
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
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 lg:max-w-5xl lg:px-8 lg:py-16">
      <PageHeader
        className="mb-6"
        eyebrow="Your profile"
        title="Training profile"
        subtitle="Smarty Coach reads every field below before it builds a workout."
      />

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
              <select
                className={selectClass}
                value={p.gender ?? ""}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option value="">Select…</option>
                {GENDERS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
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
                {FITNESS_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sessions per week">
              <select
                className={selectClass}
                value={String(p.training_frequency ?? 3)}
                onChange={(e) => set("training_frequency", Number(e.target.value))}
              >
                {SESSIONS_PER_WEEK.map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "session" : "sessions"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Typical duration (approx.)">
              <select
                className={selectClass}
                value={String(p.typical_duration_min ?? 30)}
                onChange={(e) => set("typical_duration_min", Number(e.target.value))}
              >
                {DURATIONS.map((n) => (
                  <option key={n} value={n}>
                    ~{n} minutes
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard icon={Target} title="Your goals" hint="Pick from the list — no typing">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary goal">
              <select
                className={selectClass}
                value={p.primary_goal ?? ""}
                onChange={(e) => set("primary_goal", e.target.value)}
              >
                <option value="">Select…</option>
                {PROFILE_GOALS.map((g) => (
                  <option key={g.id} value={g.label}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Secondary goal (optional)">
              <select
                className={selectClass}
                value={p.secondary_goal ?? ""}
                onChange={(e) => set("secondary_goal", e.target.value)}
              >
                <option value="">None</option>
                {PROFILE_GOALS.map((g) => (
                  <option key={g.id} value={g.label}>
                    {g.label}
                  </option>
                ))}
              </select>
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
          title="Exercises you love"
          hint="Picked straight from the library — Smarty Coach programs them whenever they fit"
        >
          <ExercisePicker
            title="Choose the exercises you love"
            emptyHint="Nothing picked yet. Choose a body part, then tap the exercises you want to see often."
            value={p.favorite_exercise_ids ?? []}
            onChange={(ids) => set("favorite_exercise_ids", ids)}
          />
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Movement styles you enjoy
            </p>
            <Pills
              options={MOVEMENT_DISLIKES.map((m) => ({ id: m.label, label: m.label }))}
              value={p.favorite_exercises ?? []}
              onToggle={(id) => toggleList("favorite_exercises", id)}
            />
          </div>
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
            <div className="mt-4 space-y-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm font-bold">You answered yes to at least one question</p>
              <p className="text-sm leading-5">
                Please speak to your doctor before you start training, and tell them which
                question you answered yes to. Smarty Workout is not medical advice. If you choose
                to train anyway you do so at your own responsibility — start easy, stop
                immediately if you feel pain, chest tightness, dizziness or breathlessness, and
                get medical help if symptoms continue.
              </p>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-5">
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
                  I have read this warning, I take full responsibility, and I choose to continue.
                </span>
              </label>
            </div>
          ) : (
            Object.keys(p.readiness_answers ?? {}).length === 5 && (
              <p className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm leading-5 text-muted-foreground">
                All answers are no — you are clear to train. Keep it sensible and stop if anything
                feels wrong.
              </p>
            )
          )}

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
          title="Movements you dislike"
          hint="Tap to exclude — these will never be programmed"
        >
          <Pills
            options={MOVEMENT_DISLIKES.map((m) => ({ id: m.label, label: m.label }))}
            value={p.disliked_exercises ?? []}
            onToggle={(id) => toggleList("disliked_exercises", id)}
          />
        </SectionCard>

        <SectionCard
          icon={ShieldAlert}
          title="Injuries & limitations"
          hint="Always respected when building your workout"
        >
          <Pills
            options={LIMITATIONS.map((l) => ({ id: l.label, label: l.label }))}
            value={p.limitations ?? []}
            onToggle={(id) => toggleList("limitations", id)}
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

      <Dialog open={saved} onOpenChange={setSaved}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Training profile saved</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Smarty Coach reads this profile every single time it builds a workout for you — your
            own workouts and your Workout of the Day. Change it whenever you like and the next
            workout follows the new answers.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setSaved(false)}>
              Keep editing
            </Button>
            <Button
              onClick={() => {
                setSaved(false);
                navigate({ to: wasOnboarded ? "/coach" : "/pricing" });
              }}
            >
              {wasOnboarded ? "Create a workout" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
