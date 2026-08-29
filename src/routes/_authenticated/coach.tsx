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
  Heart,

} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateWorkout } from "@/lib/coach.functions";
import { isOnline } from "@/lib/offline/connectivity";
import { enqueueAction } from "@/lib/offline/queue";
import {
  getExercisePreferences,
  setUseLibraryPreferences as saveUseLibraryPreferences,
} from "@/lib/preferences.functions";
import { Link } from "@tanstack/react-router";
import { ParqWaiverDialog } from "@/components/ParqWaiverDialog";
import { hasParqAck, setParqAck } from "@/lib/parq-ack";
import { GeneratingDialog } from "@/components/workout/GeneratingDialog";
import { MembershipRequiredDialog } from "@/components/MembershipRequiredDialog";
import { CoachRecommendationCard } from "@/components/coach/CoachRecommendationCard";
import { levelToStars, starsToLevel } from "@/lib/workout/spec";


import {
  EQUIPMENT,
  GOALS,
  BODY_FOCUS,
  FOCUS_GOALS,

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
import { getMyAccessState } from "@/lib/access.functions";
import { PageHeader } from "@/components/PageHeader";

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
      className={`flex h-12 w-full items-center justify-center truncate whitespace-nowrap rounded-2xl border px-2.5 text-[13px] font-semibold leading-none transition sm:text-sm ${
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
    <section className="rounded-3xl border-2 border-primary bg-card p-5 shadow-sm sm:p-6">
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
  const [goal, setGoal] = useState<string>("strength");
  const [focus, setFocus] = useState<string>("FULL BODY");
  const showFocus = FOCUS_GOALS.includes(goal);

  const [mood, setMood] = useState<string>("normal");
  const [minutes, setMinutes] = useState<number>(30);
  const [location, setLocation] = useState<string>("home");
  const [equipment, setEquipment] = useState<string[]>(["bodyweight"]);
  const [otherEquipment, setOtherEquipment] = useState("");
  const [note, setNote] = useState("");
  const [useLibraryPreferences, setUseLibraryPreferences] = useState(true);

  const [busy, setBusy] = useState(false);
  const [name, setName] = useState<string>("");
  const [level, setLevel] = useState<string>("auto");
  const [confirmHard, setConfirmHard] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [wodMode, setWodMode] = useState(false);
  const [profileReady, setProfileReady] = useState<boolean | null>(null);
  const [parqFlags, setParqFlags] = useState<string[]>([]);
  const [parqOpen, setParqOpen] = useState(false);
  const [premium, setPremium] = useState<boolean | null>(null);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [pendingSurprise, setPendingSurprise] = useState<boolean | null>(null);


  useEffect(() => {
    void getMyAccessState()
      .then((access) => {
        setProfileReady(
          access.profileComplete && access.healthAcknowledged && access.readinessComplete,
        );
        setParqFlags(access.readinessFlagged ? access.readinessFlags : []);
        setPremium(access.premium);
      })
      .catch(() => setProfileReady(null));
    void getExercisePreferences()
      .then((p) => setUseLibraryPreferences(p.useLibraryPreferences))
      .catch(() => undefined);
  }, []);




  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name,preferred_environment,preferred_equipment,typical_duration_min,wod_mode")
        .eq("id", auth.user.id)
        .maybeSingle();
      const p = data as {
        display_name?: string | null;
        preferred_environment?: string | null;
        preferred_equipment?: string[] | null;
        typical_duration_min?: number | null;
        wod_mode?: boolean | null;
      } | null;
      if (!p) return;
      setName(p.display_name ?? "");
      if (p.preferred_environment) setLocation(p.preferred_environment);
      if (p.preferred_equipment?.length) setEquipment(p.preferred_equipment);
      if (p.typical_duration_min) setMinutes(p.typical_duration_min);
      setWodMode(Boolean(p.wod_mode));
    })();
  }, []);

  useEffect(() => {
    setResuming(localStorage.getItem("smarty:generating") === "1");
  }, []);

  function toggleEquipment(id: string) {
    setEquipment((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  async function generate(surprise = false, levelOverride?: string) {
    if (busy || wodMode) return;
    const request = {
      goal: surprise ? "custom" : goal,
      ...(surprise || !showFocus ? {} : { focus }),

      mood,
      minutes,
      location,
      equipment: equipment.length ? equipment : ["bodyweight"],
      equipmentOther: equipment.includes("other") ? otherEquipment.trim() : "",
      note: note.trim(),
      useLibraryPreferences,

      level: surprise ? "auto" : (levelOverride ?? level),
      surprise,
    };
    if (!isOnline()) {
      // Building a workout needs Smarty Coach on the server, so we never fake it.
      // The request is stored safely and sent automatically when the connection returns.
      const { data: auth } = await supabase.auth.getUser();
      await enqueueAction("workout-generate", request, auth.user?.id ?? null, 2);
      toast.success("You're offline. Your workout request is saved and will be created automatically once you're back online.");
      return;
    }
    setBusy(true);
    setResuming(false);
    localStorage.setItem("smarty:generating", "1");
    try {
      const res = await run({ data: request });
      navigate({ to: "/workout/$workoutId", params: { workoutId: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Smarty Coach could not build that workout.");
    } finally {
      localStorage.removeItem("smarty:generating");
      setBusy(false);
    }
  }

  function requestGenerate(surprise: boolean) {
    if (premium === false) {
      setMembershipOpen(true);
      return;
    }
    if (parqFlags.length > 0 && !hasParqAck()) {
      setPendingSurprise(surprise);
      setParqOpen(true);
      return;
    }
    if (!surprise && level === "advanced" && LOW_ENERGY_MOODS.includes(mood)) {
      setConfirmHard(true);
      return;
    }
    void generate(surprise);
  }



  if (profileReady === false) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
        <PageHeader
          className="mb-6"
          eyebrow="Smarty Coach"
          title="Complete your training profile first"
          subtitle="Smarty Coach builds around you — it needs your profile before the first workout."
        />
        <div className="rounded-2xl border-2 border-primary bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Your age, level, goal, equipment, environment, session length and health
            acknowledgement are required once. After that, every workout combines your profile with
            the questions you answer here.
          </p>
          <Button asChild className="mt-4 h-14 w-full rounded-2xl text-base font-extrabold">
            <Link to="/profile">Complete Training Profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (

    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <PageHeader
        className="mb-6"
        eyebrow="Smarty Coach"
        title={name ? `${name}, what's your workout today?` : "What's your workout today?"}
        subtitle="Smarty Coach already knows your profile. Answer below — or let it decide for you."
      />

      {resuming && !busy ? (
        <div className="mb-5 rounded-2xl border-2 border-primary bg-primary/5 p-4 text-sm">
          <p className="font-semibold">A workout was being built when you left.</p>
          <p className="mt-1 text-muted-foreground">
            Smarty Coach finishes on the server, so it keeps going even if you close the page. Check
            your{" "}
            <button
              type="button"
              className="font-semibold text-primary underline"
              onClick={() => navigate({ to: "/logbook", search: { filter: "all" as const, view: "list" as const } })}
            >
              logbook
            </button>{" "}
            — if it isn't there, generate again.
          </p>
        </div>
      ) : null}

      <GeneratingDialog open={busy} />
      <MembershipRequiredDialog open={membershipOpen} onOpenChange={setMembershipOpen} />

      <ParqWaiverDialog
        open={parqOpen}
        flags={parqFlags}
        confirmLabel="I confirm — build my workout"
        onConfirm={() => {
          setParqAck();
          setParqOpen(false);
          const surprise = pendingSurprise;
          setPendingSurprise(null);
          if (surprise !== null) void generate(surprise);
        }}
        onCancel={() => {
          setParqOpen(false);
          setPendingSurprise(null);
        }}
      />



      {wodMode ? (
        <div className="mb-6 rounded-3xl border-2 border-primary bg-primary/5 p-5 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">WOD mode is on</p>
          <p className="mt-2 text-sm text-muted-foreground">
            You're following the periodization programme, so Smarty Coach builds two workouts for
            you each day. You can still use every workout you already have, but new manual
            generation stays paused until you unsubscribe.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button asChild className="h-12 rounded-2xl font-extrabold">
              <Link to="/wod">Open today's workout</Link>
            </Button>
            <Button asChild variant="secondary" className="h-12 rounded-2xl">
              <Link to="/account">Turn WOD mode off</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className={`mb-6 rounded-3xl border-2 border-primary bg-primary/5 p-5 text-center${wodMode ? " pointer-events-none opacity-40" : ""}`}>
        <p className="text-sm font-semibold">Don't feel like choosing?</p>
        <Button
          size="lg"
          className="mt-3 h-14 w-full rounded-2xl text-base font-extrabold"
          disabled={busy || wodMode}
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

      <div className={`space-y-4${wodMode ? " pointer-events-none opacity-40" : ""}`}>
        <QuestionCard step={1} icon={Target} title="What's your goal today?">
          <Grid>
            {GOALS.map((g) => (
              <Chip key={g.id} active={goal === g.id} onClick={() => setGoal(g.id)}>
                {g.label}
              </Chip>
            ))}
          </Grid>
        </QuestionCard>

        {showFocus ? (
          <QuestionCard
            step={2}
            icon={Dumbbell}
            title={goal === "muscle" ? "Which muscles today?" : "Which part of the body?"}
            hint="Smarty Coach only picks exercises that train what you choose."
          >
            <Grid>
              {BODY_FOCUS.map((f) => (
                <Chip key={f.id} active={focus === f.id} onClick={() => setFocus(f.id)}>
                  {f.label}
                </Chip>
              ))}
            </Grid>
          </QuestionCard>
        ) : null}


        <QuestionCard step={showFocus ? 3 : 2} icon={HeartPulse} title="How are you feeling today?">
          <Grid>
            {MOODS.map((m) => (
              <Chip key={m.id} active={mood === m.id} onClick={() => setMood(m.id)}>
                {m.label}
              </Chip>
            ))}
          </Grid>
        </QuestionCard>

        <QuestionCard
          step={showFocus ? 4 : 3}
          icon={Flame}
          title="How hard should it be?"
          hint="Auto blends your profile level with today's mood. Pick a level to override it."
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevel(l.id)}
                className={`min-h-14 rounded-2xl border px-4 py-3 text-left transition ${
                  level === l.id
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                <span className="block text-sm font-semibold">{l.label}</span>
                <span
                  className={`block text-xs ${level === l.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {l.hint}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <CoachRecommendationCard
              selectedStars={
                level === "auto" ? 2 : levelToStars(level as "beginner" | "intermediate" | "advanced")
              }
              onApplyStars={(stars) => setLevel(starsToLevel(stars))}
            />
          </div>
        </QuestionCard>



        <QuestionCard step={showFocus ? 5 : 4} icon={Clock} title="Time available">
          <Grid>
            {TIMES.map((t) => (
              <Chip key={t} active={minutes === t} onClick={() => setMinutes(t)}>
                {t} min
              </Chip>
            ))}
          </Grid>
        </QuestionCard>

        <QuestionCard step={showFocus ? 6 : 5} icon={MapPin} title="Where are you training?">
          <Grid>
            {LOCATIONS.map((l) => (
              <Chip key={l.id} active={location === l.id} onClick={() => setLocation(l.id)}>
                {l.label}
              </Chip>
            ))}
          </Grid>
        </QuestionCard>

        <QuestionCard
          step={showFocus ? 7 : 6}
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
          step={showFocus ? 8 : 7}
          icon={Heart}
          title="Use my library preferences?"
          hint="Your liked exercises get priority, your disliked ones are left out."
        >
          <Grid>
            <Chip active={useLibraryPreferences} onClick={() => {
                setUseLibraryPreferences(true);
                void saveUseLibraryPreferences({ data: { enabled: true } }).catch(() => undefined);
              }}>
              Yes
            </Chip>
            <Chip active={!useLibraryPreferences} onClick={() => {
                setUseLibraryPreferences(false);
                void saveUseLibraryPreferences({ data: { enabled: false } }).catch(() => undefined);
              }}>
              No
            </Chip>
          </Grid>
          <p className="mt-2 text-xs text-muted-foreground">
            Mark exercises in the{" "}
            <Link to="/exercise-library" className="font-semibold text-primary">
              Exercise Library
            </Link>
            .
          </p>
        </QuestionCard>

        <QuestionCard
          step={showFocus ? 9 : 8}
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
          disabled={busy || wodMode}
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

      <AlertDialog open={confirmHard} onOpenChange={setConfirmHard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advanced today — are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You told Smarty Coach you're feeling{" "}
              {MOODS.find((m) => m.id === mood)?.label.toLowerCase() ?? mood}. Advanced means high
              volume, complex movements and short rest. Training hard on a low-energy day raises
              injury risk. Smarty Coach can scale it to match how you feel instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setLevel("auto");
                void generate(false, "auto");
              }}
            >
              Scale it to my mood
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void generate(false)}>
              Yes, go advanced
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
