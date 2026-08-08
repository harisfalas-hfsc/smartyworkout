import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Flame, Loader2, Play, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTodayWod, getDailyHub } from "@/lib/daily.functions";

export const Route = createFileRoute("/_authenticated/wod")({
  head: () => ({
    meta: [
      { title: "Workout of the Day — Smarty Workout" },
      {
        name: "description",
        content:
          "Today's Workout of the Day, built from the Smarty Workout 84-day periodization cycle.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WodPage,
});

type Hub = Awaited<ReturnType<typeof getDailyHub>>;

function WodPage() {
  const navigate = useNavigate();
  const load = useServerFn(getDailyHub);
  const build = useServerFn(generateTodayWod);
  const [hub, setHub] = useState<Hub | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load({}).then(setHub).catch(() => setHub(null));
  }, [load]);

  async function make() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await build({});
      navigate({ to: "/workout/$workoutId", params: { workoutId: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build today's workout.");
    } finally {
      setBusy(false);
    }
  }

  if (!hub) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const { cycle, workout } = hub;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Workout of the Day
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{cycle.category}</h1>
        <p className="mt-2 text-muted-foreground">
          Day {cycle.dayIn84} of the 84-day cycle · block {Math.ceil(cycle.dayIn84 / 28)} of 3
        </p>
      </div>

      <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Category
            </p>
            <p className="mt-1 text-sm font-extrabold">{cycle.category}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Difficulty
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm font-extrabold">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              {cycle.difficulty ?? "Recovery"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Focus
            </p>
            <p className="mt-1 text-sm font-extrabold">{cycle.strengthFocus ?? "—"}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {cycle.isRecovery
            ? "Today is a scheduled recovery day. Smarty Coach keeps it light — mobility, breathing and easy movement."
            : "Every athlete on Smarty Workout trains the same category and intensity today. Your session is still built around your equipment, level and history."}
        </p>

        {workout ? (
          <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Ready</p>
            <p className="mt-1 text-lg font-extrabold leading-tight">{workout.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {workout.duration_min} min · {workout.difficulty_stars}★ ·{" "}
              {workout.status === "completed" ? "Completed" : "Not done yet"}
            </p>
            <Button asChild className="mt-3 h-12 w-full rounded-2xl font-extrabold">
              <Link to="/workout/$workoutId" params={{ workoutId: workout.id }}>
                <Play className="mr-2 h-4 w-4" /> Open today's workout
              </Link>
            </Button>
          </div>
        ) : (
          <Button
            className="mt-5 h-14 w-full rounded-2xl text-base font-extrabold"
            disabled={busy}
            onClick={() => void make()}
          >
            {busy ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-5 w-5" />
            )}
            {busy ? "Smarty Coach is building it…" : "Build today's Workout of the Day"}
          </Button>
        )}
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold">How the cycle works</p>
            <p className="text-sm text-muted-foreground">84 days, three 28-day blocks.</p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li>Each day has a fixed category and intensity, so the whole cycle stays balanced.</li>
          <li>Strength days rotate focus: lower, upper, full body, push/pull pairings, core & glutes.</li>
          <li>Every 10th day around the block is recovery — that's on purpose.</li>
          <li>Difficulty rotates block to block so you never repeat the same stress pattern.</li>
        </ul>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Flame className="h-3.5 w-3.5 text-primary" /> Turn on daily delivery in{" "}
          <Link to="/account" className="font-semibold text-primary underline">
            My account
          </Link>{" "}
          and it lands automatically.
        </p>
      </section>
    </div>
  );
}
