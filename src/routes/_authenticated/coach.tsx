import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateWorkout } from "@/lib/coach.functions";
import { EQUIPMENT, GOALS, LOCATIONS, MOODS, TIMES } from "@/lib/coach-options";
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
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow"
          : "border-border bg-card text-foreground hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function CoachPage() {
  const navigate = useNavigate();
  const run = useServerFn(generateWorkout);
  const [goal, setGoal] = useState<string>("fullbody");
  const [mood, setMood] = useState<string>("normal");
  const [minutes, setMinutes] = useState<number>(30);
  const [location, setLocation] = useState<string>("home");
  const [equipment, setEquipment] = useState<string[]>(["bodyweight"]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name,preferred_environment,preferred_equipment,typical_duration_min")
        .eq("id", auth.user.id)
        .maybeSingle();
      const p = data as any;
      if (!p) return;
      setName(p.display_name ?? "");
      if (p.preferred_environment) setLocation(p.preferred_environment);
      if (p.preferred_equipment?.length) setEquipment(p.preferred_equipment);
      if (p.typical_duration_min) setMinutes(p.typical_duration_min);
    })();
  }, []);

  function toggleEquipment(id: string) {
    setEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  }

  async function generate(surprise = false) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await run({
        data: {
          goal: surprise ? "custom" : goal,
          mood,
          minutes,
          location,
          equipment: equipment.length ? equipment : ["bodyweight"],
          note: note.trim(),
          surprise,
        },
      });
      navigate({ to: "/workout/$workoutId", params: { workoutId: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Smarty Coach could not build that workout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Smarty Coach
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          {name ? `${name}, what's your workout today?` : "What's your workout today?"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          You don't choose a workout — Smarty Coach creates the one you need today.
        </p>
      </div>

      <div className="space-y-7 rounded-3xl border border-border bg-card p-5 sm:p-7">
        <Section title="Goal">
          {GOALS.map((g) => (
            <Chip key={g.id} active={goal === g.id} onClick={() => setGoal(g.id)}>
              {g.label}
            </Chip>
          ))}
        </Section>

        <Section title="How are you feeling today?">
          {MOODS.map((m) => (
            <Chip key={m.id} active={mood === m.id} onClick={() => setMood(m.id)}>
              {m.label}
            </Chip>
          ))}
        </Section>

        <Section title="Time available">
          {TIMES.map((t) => (
            <Chip key={t} active={minutes === t} onClick={() => setMinutes(t)}>
              {t} min
            </Chip>
          ))}
        </Section>

        <Section title="Where are you training?">
          {LOCATIONS.map((l) => (
            <Chip key={l.id} active={location === l.id} onClick={() => setLocation(l.id)}>
              {l.label}
            </Chip>
          ))}
        </Section>

        <Section title="Equipment available">
          {EQUIPMENT.map((e) => (
            <Chip
              key={e.id}
              active={equipment.includes(e.id)}
              onClick={() => toggleEquipment(e.id)}
            >
              {e.label}
            </Chip>
          ))}
        </Section>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Anything else? (optional)
          </h2>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. shoulder is a bit sore, I'd love something for legs"
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="flex-1" disabled={busy} onClick={() => generate(false)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {busy ? "Smarty Coach is thinking…" : "Create my workout"}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={() => generate(true)}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Surprise me
          </Button>
        </div>
      </div>
    </div>
  );
}
