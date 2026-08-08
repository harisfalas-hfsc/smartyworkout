import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generatePlan, listPlanVersions, restorePlanVersion } from "@/lib/plan.functions";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, Utensils, ShoppingBasket, RefreshCw, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { exportPlanPdf, exportEquipmentPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/_authenticated/plans/$sessionId")({
  head: () => ({
    meta: [{ title: "My plan — SmartyWorkout" }, { name: "robots", content: "noindex" }],
  }),
  component: PlanView,
});

interface Session {
  id: string;
  duration_weeks: number;
  credits_total: number;
  credits_used: number;
  status: string;
}
interface PlanRow {
  id: string;
  version: number;
  plan: any;
  rationale: string | null;
  refinement_note: string | null;
  is_final: boolean;
  created_at: string;
}

function PlanView() {
  const { sessionId } = Route.useParams();
  const generate = useServerFn(generatePlan);
  const listVersions = useServerFn(listPlanVersions);
  const restore = useServerFn(restorePlanVersion);
  const [session, setSession] = useState<Session | null>(null);
  const [versions, setVersions] = useState<PlanRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [refineText, setRefineText] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: s } = await supabase
      .from("generation_sessions")
      .select("id,duration_weeks,credits_total,credits_used,status")
      .eq("id", sessionId)
      .maybeSingle();
    setSession(s as Session | null);
    const rows = (await listVersions({ data: { sessionId } })) as PlanRow[];
    setVersions(rows);
    // Prefer is_final; else newest
    const active = rows.find((r) => r.is_final) ?? rows[0];
    setActiveId((prev) => prev ?? active?.id ?? null);
  }, [sessionId, listVersions]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoGenerating) return;
    const interval = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [autoGenerating, load]);

  useEffect(() => {
    if (autoGenerating && versions.length > 0) {
      setAutoGenerating(false);
      setGenerationError(null);
    }
  }, [autoGenerating, versions.length]);

  // Recovery: paid, no plan → auto-generate.
  useEffect(() => {
    if (!session || versions.length > 0 || autoGenerating) return;
    if (session.status !== "paid") return;
    if ((session.credits_used ?? 0) > 0) return;
    setAutoGenerating(true);
    setGenerationError(null);
    (async () => {
      try {
        const res = await generate({ data: { sessionId } });
        if (res.error) {
          setGenerationError(res.error);
          toast.error(res.error);
        }
        else toast.success("Your plan is ready");
        await load();
      } catch (e: any) {
        const message = e?.message ?? "Generation failed";
        setGenerationError(message);
        toast.error(message);
      } finally {
        setAutoGenerating(false);
      }
    })();
  }, [session, versions.length, autoGenerating, generate, sessionId, load]);

  async function refine() {
    if (!refineText.trim()) return toast.error("Describe the change you want");
    setBusy(true);
    try {
      const res = await generate({
        data: { sessionId, refinement: refineText.trim() },
      });
      if (res.error) throw new Error(res.error);
      setRefineText("");
      setActiveId(null); // let load() pick the new active
      await load();
      if (res.warnings?.length) {
        toast.warning(`Plan refined with ${res.warnings.length} warning(s)`);
      } else {
        toast.success("Plan refined");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Refinement failed");
    } finally {
      setBusy(false);
    }
  }

  async function doRestore(version: number) {
    setBusy(true);
    try {
      await restore({ data: { sessionId, version } });
      setActiveId(null);
      await load();
      toast.success(`Restored version ${version} (no credit spent)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  const active = versions.find((v) => v.id === activeId) ?? versions[0] ?? null;

  async function exportPdf() {
    if (!active) return;
    try {
      await exportPlanPdf(active.plan, session?.duration_weeks ?? 1);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not build PDF");
    }
  }

  async function exportEquipment() {
    if (!active?.plan?.weeks) return;
    try {
      await exportEquipmentPdf(active.plan);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not build PDF");
    }
  }

  if (!session)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  const remaining = session.credits_total - session.credits_used;
  const warnings: string[] = active?.plan?._warnings ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Your {session.duration_weeks}-week plan</h1>
          <p className="text-sm text-muted-foreground">
            {remaining} refinement{remaining === 1 ? "" : "s"} remaining · viewing v{active?.version ?? 1}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportEquipment} disabled={!active}>
            <ShoppingBasket className="mr-1.5 h-4 w-4" /> Equipment PDF
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={!active}>
            <Download className="mr-1.5 h-4 w-4" /> Plan PDF
          </Button>
        </div>
      </div>

      {!active ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {autoGenerating ? (
              <>
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                Building your plan… this can take up to 2 minutes.
              </>
            ) : generationError ? (
              <>
                <p className="mb-4 text-destructive">{generationError}</p>
                <Button
                  onClick={async () => {
                    setAutoGenerating(true);
                    setGenerationError(null);
                    try {
                      const res = await generate({ data: { sessionId } });
                      if (res.error) {
                        setGenerationError(res.error);
                        toast.error(res.error);
                      } else {
                        toast.success("Your plan is ready");
                      }
                      await load();
                    } catch (e: any) {
                      const message = e?.message ?? "Generation failed";
                      setGenerationError(message);
                      toast.error(message);
                    } finally {
                      setAutoGenerating(false);
                    }
                  }}
                >
                  Try again
                </Button>
              </>
            ) : session.status === "paid" ? (
              <>
                <p className="mb-4">Your answers are saved. Tap below to build your plan.</p>
                <Button
                  onClick={async () => {
                    setAutoGenerating(true);
                    setGenerationError(null);
                    try {
                      const res = await generate({ data: { sessionId } });
                      if (res.error) {
                        setGenerationError(res.error);
                        toast.error(res.error);
                      } else {
                        toast.success("Your plan is ready");
                      }
                      await load();
                    } catch (e: any) {
                      const message = e?.message ?? "Generation failed";
                      setGenerationError(message);
                      toast.error(message);
                    } finally {
                      setAutoGenerating(false);
                    }
                  }}
                >
                  Generate my plan
                </Button>
              </>
            ) : (
              "No plan yet."
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-1">The generator couldn't fully match your rules:</p>
                <ul className="list-disc pl-4 text-xs">
                  {warnings.slice(0, 5).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {active.plan?.summary && (
            <Card>
              <CardContent className="p-4 text-sm">
                <p className="font-semibold">
                  {active.plan.summary.daysPerWeek} days / week ·{" "}
                  <span className="text-muted-foreground">
                    {active.plan.summary.sessionMinutes} min per session
                  </span>
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {active.plan.summary.trainingStyle} · {active.plan.summary.goal}
                </p>
              </CardContent>
            </Card>
          )}

          {(active.plan?.weeks ?? []).map((w: any) => (
            <div key={w.weekNumber} className="space-y-3">
              <h2 className="text-lg font-bold">Week {w.weekNumber}</h2>
              {w.note && <p className="text-sm text-muted-foreground">{w.note}</p>}
              {(w.days ?? []).map((d: any) => (
                <Card key={d.day}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold">
                        Day {d.day}
                        {d.focus ? ` · ${d.focus}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.rest ? "Rest day" : `${d.durationMin ?? "-"} min`}
                      </p>
                    </div>
                    {d.warmup && (
                      <p className="mb-2 text-xs text-muted-foreground">Warm-up: {d.warmup}</p>
                    )}
                    <div className="space-y-3">
                      {(d.exercises ?? []).map((m: any, i: number) => (
                        <div key={i} className="rounded-md border p-3 text-sm">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-medium">
                              <Dumbbell className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
                              {m.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.sets}×{m.reps} · rest {m.restSeconds}s
                              {m.rpe ? ` · RPE ${m.rpe}` : ""}
                            </p>
                          </div>
                          {m.muscleGroup ? (
                            <p className="mt-1 text-xs text-muted-foreground">{m.muscleGroup}</p>
                          ) : null}
                          {m.notes && <p className="mt-1 text-xs">{m.notes}</p>}
                        </div>
                      ))}
                    </div>
                    {d.cooldown && (
                      <p className="mt-2 text-xs text-muted-foreground">Cool-down: {d.cooldown}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {w.equipmentList?.length ? (
                <Card>
                  <CardContent className="p-4">
                    <p className="mb-2 font-semibold">
                      <ShoppingBasket className="mr-1.5 inline h-4 w-4 text-primary" />
                      Equipment list — week {w.weekNumber}
                    </p>
                    <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                      {w.equipmentList.map((g: any, i: number) => (
                        <li key={i} className="text-muted-foreground">
                          • {g.item}
                          {g.note ? ` (${g.note})` : ""}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ))}
            </div>
          ))}

          {active.plan?.rationale && (
            <Card>
              <CardContent className="p-4">
                <p className="font-semibold">Why this plan fits you</p>
                <p className="mt-1 text-sm text-muted-foreground">{active.plan.rationale}</p>
              </CardContent>
            </Card>
          )}
          {active.plan?.disclaimer && (
            <p className="text-xs text-muted-foreground">{active.plan.disclaimer}</p>
          )}
        </div>
      )}

      {versions.length > 1 && (
        <Card className="mt-8">
          <CardContent className="p-4">
            <p className="mb-3 font-semibold">
              <History className="mr-1.5 inline h-4 w-4 text-primary" />
              Plan versions
            </p>
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm ${
                    v.id === active?.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">
                      v{v.version}
                      {v.is_final ? " · active" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleString()}
                      {v.refinement_note ? ` · "${v.refinement_note}"` : " · initial"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={v.id === active?.id ? "secondary" : "outline"}
                      onClick={() => setActiveId(v.id)}
                    >
                      View
                    </Button>
                    {!v.is_final && (
                      <Button size="sm" onClick={() => doRestore(v.version)} disabled={busy}>
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Restoring a previous version does NOT cost a credit.
            </p>
          </CardContent>
        </Card>
      )}

      {active && remaining > 0 && (
        <Card className="mt-8">
          <CardContent className="p-4">
            <p className="font-semibold">
              <RefreshCw className="mr-1.5 inline h-4 w-4 text-primary" />
              Refine your plan ({remaining} left)
            </p>
            <Textarea
              className="mt-2"
              rows={3}
              placeholder='e.g. "one meal per day", "no dairy", "1800 kcal", "more protein"'
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button onClick={refine} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Refine plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 text-center">
        <Button asChild variant="ghost" size="sm">
          <Link to="/plans">← All plans</Link>
        </Button>
      </div>
    </div>
  );
}
