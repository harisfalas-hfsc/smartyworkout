import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Wand2,
  Target,
  HeartPulse,
  Clock,
  MapPin,
  Dumbbell,
  MessageSquare,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateWorkout } from "@/lib/coach.functions";
import {
  EQUIPMENT,
  GOALS,
  LEVELS,
  LOCATIONS,
  LOW_ENERGY_MOODS,
  MOODS,
  TIMES,
} from "@/lib/coach-options";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "Smarty Coach — your AI workout today" },
      {
        name: "description",
        content:
          "Tell Smarty Coach your goal, mood, time and equipment and get a personalised workout built from a 1,300+ exercise library.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoachPage,
});

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

function QuestionCard({
  step,
  icon: Icon,
  title,
  hint,
  children,
}: {
  step: number;
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
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Step {step}
          </p>
          <h2 className="text-lg font-extrabold leading-tight">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{children}</div>;
}

function CoachPage() {
  const navigate = useNavigate();
  const run = useServerFn(generateWorkout);
  const [goal, setGoal] = useState<string>("fullbody");
  const [mood, setMood] = useState<string>("normal");
  const [minutes, setMinutes] = useState<number>(30);
  const [location, setLocation] = useState<string>("home");
  const [equipment, setEquipment] = useState<string[]>(["bodyweight"]);
  const [otherEquipment, setOtherEquipment] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<string>("");
  const [level, setLevel] = useState<string>("auto");
  const [confirmHard, setConfirmHard] = useState(false);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name,preferred_environment,preferred_equipment,typical_duration_min")
        .eq("id", auth.user.id)
        .maybeSingle();
      const p = data as {
        display_name?: string | null;
        preferred_environment?: string | null;
        preferred_equipment?: string[] | null;
        typical_duration_min?: number | null;
      } | null;
      if (!p) return;
      setName(p.display_name ?? "");
      if (p.preferred_environment) setLocation(p.preferred_environment);
      if (p.preferred_equipment?.length) setEquipment(p.preferred_equipment);
      if (p.typical_duration_min) setMinutes(p.typical_duration_min);
    })();
  }, []);

  useEffect(() => {
    setResuming(localStorage.getItem("smarty:generating") === "1");
  }, []);

  function toggleEquipment(id: string) {
    setEquipment((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  async function generate(surprise = false) {
    if (busy) return;
    setBusy(true);
    setResuming(false);
    localStorage.setItem("smarty:generating", "1");
    try {
      const res = await run({
        data: {
          goal: surprise ? "custom" : goal,
          mood,
          minutes,
          location,
          equipment: equipment.length ? equipment : ["bodyweight"],
          equipmentOther: equipment.includes("other") ? otherEquipment.trim() : "",
          note: note.trim(),
          level: surprise ? "auto" : level,
          surprise,
        },
      });
      navigate({ to: "/workout/$workoutId", params: { workoutId: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Smarty Coach could not build that workout.");
    } finally {
      localStorage.removeItem("smarty:generating");
      setBusy(false);
    }
  }

  function requestGenerate(surprise: boolean) {
    if (!surprise && level === "advanced" && LOW_ENERGY_MOODS.includes(mood)) {
      setConfirmHard(true);
      return;
    }
    void generate(surprise);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Smarty Coach
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          {name ? `${name}, what's your workout today?` : "What's your workout today?"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Smarty Coach already knows your profile. Answer below — or let it decide for you.
        </p>
      </div>

      {resuming && !busy ? (
        <div className="mb-4 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">A workout was being built when you left.</p>
          <p className="mt-1 text-muted-foreground">
            Smarty Coach finishes on the server, so it keeps going even if you close the page. Check
            your{" "}
            <button
              type="button"
              className="font-semibold text-primary underline"
              onClick={() => navigate({ to: "/logbook" })}
            >
              logbook
            </button>{" "}
            — if it isn't there, generate again.
          </p>
        </div>
      ) : null}


      <div className="mb-6 rounded-3xl border-2 border-primary/40 bg-primary/5 p-5 text-center">
        <p className="text-sm font-semibold">Don't feel like choosing?</p>
        <Button
          size="lg"
          className="mt-3 h-14 w-full rounded-2xl text-base font-extrabold"
          disabled={busy}
          onClick={() => requestGenerate(true)}
        >
          {busy ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-5 w-5" />
          )}
          Surprise me
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          A different pick every day, chosen from what suits you.
        </p>
      </div>

      <div className="space-y-4">
        <QuestionCard step={1} icon={Target} title="What's your goal today?">
          <Grid>
            {GOALS.map((g) => (
              <Chip key={g.id} active={goal === g.id} onClick={() => setGoal(g.id)}>
                {g.label}
              </Chip>
            ))}
          </Grid>
        </QuestionCard>

        <QuestionCard step={2} icon={HeartPulse} title="How are you feeling today?">
          <Grid>
            {MOODS.map((m) => (
              <Chip key={m.id} active={mood === m.id} onClick={() => setMood(m.id)}>
                {m.label}
              </Chip>
            ))}
          </Grid>
        </QuestionCard>

        <QuestionCard step={3} icon={Clock} title="Time available">
          <Grid>
            {TIMES.map((t) => (
              <Chip key={t} active={minutes === t} onClick={() => setMinutes(t)}>
                {t} min
              </Chip>
            ))}
          </Grid>
        </QuestionCard>

        <QuestionCard step={4} icon={MapPin} title="Where are you training?">
          <Grid>
            {LOCATIONS.map((l) => (
              <Chip key={l.id} active={location === l.id} onClick={() => setLocation(l.id)}>
                {l.label}
              </Chip>
            ))}
          </Grid>
        </QuestionCard>

        <QuestionCard
          step={5}
          icon={Dumbbell}
          title="Equipment available"
          hint="Only what you pick will appear in your workout."
        >
          <Grid>
            {EQUIPMENT.map((e) => (
              <Chip
                key={e.id}
                active={equipment.includes(e.id)}
                onClick={() => toggleEquipment(e.id)}
              >
                {e.label}
              </Chip>
            ))}
          </Grid>
          {equipment.includes("other") ? (
            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                What else do you have? Separate with commas.
              </label>
              <Textarea
                value={otherEquipment}
                onChange={(e) => setOtherEquipment(e.target.value)}
                placeholder="e.g. sandbag, medicine ball, stability ball, rope"
                rows={2}
                className="rounded-2xl"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Smarty Coach only uses it if a matching exercise exists in the library.
              </p>
            </div>
          ) : null}
        </QuestionCard>

        <QuestionCard
          step={6}
          icon={MessageSquare}
          title="Anything else?"
          hint="Optional — Smarty Coach reads this too."
        >
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. shoulder is a bit sore, I'd love something for legs"
            rows={3}
            className="rounded-2xl"
          />
        </QuestionCard>
      </div>

      <div className="sticky bottom-4 mt-6">
        <Button
          size="lg"
          className="h-16 w-full rounded-2xl text-base font-extrabold shadow-lg"
          disabled={busy}
          onClick={() => requestGenerate(false)}
        >
          {busy ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-5 w-5" />
          )}
          {busy ? "Smarty Coach is thinking…" : "Create my workout"}
        </Button>
      </div>
    </div>
  );
}
