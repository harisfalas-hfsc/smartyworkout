import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AVOID_TAGS,
  DEFAULT_QUESTIONNAIRE,
  EQUIPMENT_OPTIONS,
  EXERCISE_CATEGORIES,
  FOCUS_AREAS,
  INJURY_TAGS,
  STEP_LABELS,
  type QuestionnaireData,
} from "@/lib/questionnaire-schema";
import { saveQuestionnaire, createSession } from "@/lib/plan.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/questionnaire")({
  head: () => ({
    meta: [
      { title: "Build your plan — SmartyWorkout" },
      {
        name: "description",
        content: "Answer a smart training questionnaire to build your personalized workout plan.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuestionnairePage,
});

const STORAGE_KEY = "smartyworkout.questionnaire.v1";

function QuestionnairePage() {
  const navigate = useNavigate();
  const save = useServerFn(saveQuestionnaire);
  const startSession = useServerFn(createSession);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<QuestionnaireData>(DEFAULT_QUESTIONNAIRE);
  const [durationWeeks, setDurationWeeks] = useState<1 | 2 | 4>(2);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data) setData({ ...DEFAULT_QUESTIONNAIRE, ...parsed.data });
        if (parsed.step) setStep(parsed.step);
        if (parsed.durationWeeks) setDurationWeeks(parsed.durationWeeks);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step, durationWeeks }));
  }, [data, step, durationWeeks]);

  const upd = <K extends keyof QuestionnaireData>(
    key: K,
    patch: Partial<QuestionnaireData[K]>,
  ) =>
    setData((d) => {
      const cur = d[key] as Record<string, unknown>;
      return {
        ...d,
        [key]: { ...cur, ...(patch as Record<string, unknown>) } as QuestionnaireData[K],
      };
    });

  function validateStep(): string | null {
    if (step === 0) {
      if (!data.basics.age || !data.basics.gender || !data.basics.weight || !data.basics.height)
        return "Please fill in age, gender, height and weight.";
    }
    if (step === 4) {
      if (!data.training.injuryTags?.length && !data.training.injuries?.trim())
        return "Please pick injuries / limitations (or select 'none').";
    }
    if (step === 6 && !data.health.disclaimerAcknowledged)
      return "Please acknowledge the health disclaimer to continue.";
    return null;
  }

  async function next() {
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    if (step < STEP_LABELS.length - 1) setStep(step + 1);
    else await submit();
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await save({
        data: { data: data as any, durationWeeks, status: "submitted" as const },
      });
      const session = await startSession({ data: { questionnaireId: res.id, durationWeeks } });
      localStorage.removeItem(STORAGE_KEY);
      navigate({ to: "/plans/$sessionId", params: { sessionId: session.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  const progress = ((step + 1) / STEP_LABELS.length) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Step {step + 1} of {STEP_LABELS.length}
          </p>
          <h1 className="text-2xl font-bold">{STEP_LABELS[step]}</h1>
        </div>
        <p className="text-sm text-muted-foreground">Free — no card needed</p>
      </div>
      <Progress value={progress} className="mb-6" />

      <Card>
        <CardContent className="p-5 sm:p-6">
          {step === 0 && <StepBasics data={data} upd={upd} />}
          {step === 1 && <StepBody data={data} upd={upd} />}
          {step === 2 && <StepActivity data={data} upd={upd} />}
          {step === 3 && <StepGoal data={data} upd={upd} />}
          {step === 4 && <StepTraining data={data} upd={upd} />}
          {step === 5 && <StepConstraints data={data} upd={upd} />}
          {step === 6 && <StepHealth data={data} upd={upd} />}
          {step === 7 && (
            <StepNotes
              data={data}
              setNotes={(v) => setData({ ...data, notes: v })}
              durationWeeks={durationWeeks}
              setDurationWeeks={setDurationWeeks}
            />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || busy}
        >
          Back
        </Button>
        <Button onClick={next} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {step === STEP_LABELS.length - 1 ? "Build my plan" : "Next"}
        </Button>
      </div>
    </div>
  );
}

type StepProps = {
  data: QuestionnaireData;
  upd: <K extends keyof QuestionnaireData>(k: K, p: Partial<QuestionnaireData[K]>) => void;
};

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-primary/60"
      }`}
    >
      {label}
    </button>
  );
}

function StepBasics({ data, upd }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Units</Label>
        <RadioGroup
          value={data.basics.units}
          onValueChange={(v) => upd("basics", { units: v as any })}
          className="mt-2 flex gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="metric" /> Metric (kg, cm)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="imperial" /> Imperial (lb, in)
          </label>
        </RadioGroup>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Age</Label>
          <Input
            type="number"
            value={data.basics.age ?? ""}
            onChange={(e) => upd("basics", { age: Number(e.target.value) || undefined })}
          />
        </div>
        <div>
          <Label>Gender</Label>
          <Select
            value={data.basics.gender}
            onValueChange={(v) => upd("basics", { gender: v as any })}
          >
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Height ({data.basics.units === "metric" ? "cm" : "in"})</Label>
          <Input
            type="number"
            value={data.basics.height ?? ""}
            onChange={(e) => upd("basics", { height: Number(e.target.value) || undefined })}
          />
        </div>
        <div>
          <Label>Weight ({data.basics.units === "metric" ? "kg" : "lb"})</Label>
          <Input
            type="number"
            value={data.basics.weight ?? ""}
            onChange={(e) => upd("basics", { weight: Number(e.target.value) || undefined })}
          />
        </div>
      </div>
      <div>
        <Label>Country / region (optional)</Label>
        <Input
          value={data.basics.country ?? ""}
          onChange={(e) => upd("basics", { country: e.target.value })}
        />
      </div>
    </div>
  );
}

function StepBody({ data, upd }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        All fields optional. Leave blank if you don't know — we'll calculate for you.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>BMR (kcal/day)</Label>
          <Input
            type="number"
            placeholder="Auto"
            value={typeof data.body.bmr === "number" ? data.body.bmr : ""}
            onChange={(e) => upd("body", { bmr: Number(e.target.value) || undefined })}
          />
        </div>
        <div>
          <Label>BMI</Label>
          <Input
            type="number"
            step="0.1"
            placeholder="Auto"
            value={typeof data.body.bmi === "number" ? data.body.bmi : ""}
            onChange={(e) => upd("body", { bmi: Number(e.target.value) || undefined })}
          />
        </div>
        <div>
          <Label>Body fat %</Label>
          <Input
            type="number"
            step="0.1"
            value={data.body.bodyFat ?? ""}
            onChange={(e) => upd("body", { bodyFat: Number(e.target.value) || undefined })}
          />
        </div>
        <div>
          <Label>Muscle mass %</Label>
          <Input
            type="number"
            step="0.1"
            value={data.body.muscleMass ?? ""}
            onChange={(e) => upd("body", { muscleMass: Number(e.target.value) || undefined })}
          />
        </div>
      </div>
      <div>
        <Label>InBody / analysis notes (optional)</Label>
        <Textarea
          value={data.body.inbodyNotes ?? ""}
          onChange={(e) => upd("body", { inbodyNotes: e.target.value })}
          placeholder="Paste any relevant analysis data"
        />
      </div>
    </div>
  );
}

function StepActivity({ data, upd }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Do you train already?</Label>
        <RadioGroup
          value={data.activity.trains ? "yes" : "no"}
          onValueChange={(v) => upd("activity", { trains: v === "yes" })}
          className="mt-2 flex gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="yes" /> Yes
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="no" /> No
          </label>
        </RadioGroup>
      </div>
      {data.activity.trains && (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Training type</Label>
            <Input
              placeholder="e.g. strength + running"
              value={data.activity.trainingType ?? ""}
              onChange={(e) => upd("activity", { trainingType: e.target.value })}
            />
          </div>
          <div>
            <Label>Sessions / week</Label>
            <Input
              type="number"
              value={data.activity.trainingFrequency ?? ""}
              onChange={(e) =>
                upd("activity", { trainingFrequency: Number(e.target.value) || undefined })
              }
            />
          </div>
          <div>
            <Label>Duration (min)</Label>
            <Input
              type="number"
              value={data.activity.trainingDurationMin ?? ""}
              onChange={(e) =>
                upd("activity", { trainingDurationMin: Number(e.target.value) || undefined })
              }
            />
          </div>
          <div className="col-span-2">
            <Label>Intensity</Label>
            <Select
              value={data.activity.trainingIntensity}
              onValueChange={(v) => upd("activity", { trainingIntensity: v as any })}
            >
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      <div>
        <Label>Daily activity level</Label>
        <Select
          value={data.activity.activityLevel}
          onValueChange={(v) => upd("activity", { activityLevel: v as any })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sedentary">Sedentary (desk job)</SelectItem>
            <SelectItem value="light">Lightly active</SelectItem>
            <SelectItem value="moderate">Moderately active</SelectItem>
            <SelectItem value="active">Very active</SelectItem>
            <SelectItem value="very_active">Extremely active</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Steps / day (optional)</Label>
          <Input
            type="number"
            value={data.activity.stepsPerDay ?? ""}
            onChange={(e) =>
              upd("activity", { stepsPerDay: Number(e.target.value) || undefined })
            }
          />
        </div>
        <div>
          <Label>TDEE (kcal/day, optional)</Label>
          <Input
            type="number"
            placeholder="Auto"
            value={typeof data.activity.tdee === "number" ? data.activity.tdee : ""}
            onChange={(e) => upd("activity", { tdee: Number(e.target.value) || undefined })}
          />
        </div>
      </div>
      <div>
        <Label>Sleep quality</Label>
        <Select
          value={data.activity.sleep}
          onValueChange={(v) => upd("activity", { sleep: v as any })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="poor">Poor</SelectItem>
            <SelectItem value="average">Average</SelectItem>
            <SelectItem value="good">Good</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function StepGoal({ data, upd }: StepProps) {
  const focus = data.goal.focusAreas ?? [];
  function toggleFocus(area: string) {
    const cur = new Set(focus);
    if (cur.has(area)) cur.delete(area);
    else cur.add(area);
    upd("goal", { focusAreas: [...cur] });
  }
  return (
    <div className="space-y-4">
      <div>
        <Label>Primary goal</Label>
        <Select value={data.goal.goal} onValueChange={(v) => upd("goal", { goal: v as any })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fat_loss">Fat loss</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="muscle_gain">Muscle gain</SelectItem>
            <SelectItem value="strength">Strength</SelectItem>
            <SelectItem value="endurance">Endurance</SelectItem>
            <SelectItem value="mobility">Mobility</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Target weight (optional)</Label>
          <Input
            type="number"
            value={data.goal.targetWeight ?? ""}
            onChange={(e) => upd("goal", { targetWeight: Number(e.target.value) || undefined })}
          />
        </div>
        <div>
          <Label>Timeline (weeks, optional)</Label>
          <Input
            type="number"
            value={data.goal.timelineWeeks ?? ""}
            onChange={(e) => upd("goal", { timelineWeeks: Number(e.target.value) || undefined })}
          />
        </div>
      </div>
      <div>
        <Label>Focus areas (optional)</Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FOCUS_AREAS.map((a) => (
            <Chip key={a} label={a} active={focus.includes(a)} onClick={() => toggleFocus(a)} />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Picked areas get extra volume — the rest of the body still gets trained.
        </p>
      </div>
    </div>
  );
}

function StepTraining({ data, upd }: StepProps) {
  function toggleExercise(kind: "likedExercises" | "dislikedExercises", ex: string) {
    const cur = new Set(data.training[kind]);
    if (cur.has(ex)) cur.delete(ex);
    else cur.add(ex);
    upd("training", { [kind]: [...cur] } as any);
  }
  function toggleInjury(tag: string) {
    const cur = new Set(data.training.injuryTags);
    if (tag === "none") {
      cur.clear();
      cur.add("none");
    } else {
      cur.delete("none");
      if (cur.has(tag)) cur.delete(tag);
      else cur.add(tag);
    }
    upd("training", { injuryTags: [...cur] });
  }
  function toggleAvoid(tag: string) {
    const cur = new Set(data.training.avoidTags);
    if (cur.has(tag)) cur.delete(tag);
    else cur.add(tag);
    upd("training", { avoidTags: [...cur] });
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>Training style</Label>
        <Select
          value={data.training.trainingStyle}
          onValueChange={(v) => upd("training", { trainingStyle: v as any })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="full_body">Full body</SelectItem>
            <SelectItem value="upper_lower">Upper / lower</SelectItem>
            <SelectItem value="push_pull_legs">Push / pull / legs</SelectItem>
            <SelectItem value="bodybuilding">Bodybuilding split</SelectItem>
            <SelectItem value="powerlifting">Powerlifting</SelectItem>
            <SelectItem value="calisthenics">Calisthenics</SelectItem>
            <SelectItem value="hiit">HIIT / conditioning</SelectItem>
            <SelectItem value="functional">Functional</SelectItem>
            <SelectItem value="home_minimal">Home / minimal equipment</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {data.training.trainingStyle === "other" && (
        <Input
          placeholder="Describe your style"
          value={data.training.trainingStyleOther ?? ""}
          onChange={(e) => upd("training", { trainingStyleOther: e.target.value })}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Training days per week</Label>
          <Input
            type="number"
            min={1}
            max={7}
            value={data.training.daysPerWeek}
            onChange={(e) =>
              upd("training", {
                daysPerWeek: Math.max(1, Math.min(7, Number(e.target.value) || 3)),
              })
            }
          />
        </div>
        <div>
          <Label>Minutes per session</Label>
          <Input
            type="number"
            min={15}
            max={150}
            value={data.training.sessionMinutes}
            onChange={(e) =>
              upd("training", {
                sessionMinutes: Math.max(15, Math.min(150, Number(e.target.value) || 45)),
              })
            }
          />
        </div>
      </div>

      <div>
        <Label>Preferred training times</Label>
        <Input
          placeholder="e.g. mornings, Mon/Wed/Fri 18:00"
          value={data.training.preferredTrainingTimes ?? ""}
          onChange={(e) => upd("training", { preferredTrainingTimes: e.target.value })}
        />
      </div>

      <div>
        <Label>Exercises you like — pick any</Label>
        <div className="mt-2 space-y-3">
          {EXERCISE_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{cat.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.exercises.map((f) => (
                  <Chip
                    key={f}
                    label={f}
                    active={data.training.likedExercises.includes(f)}
                    onClick={() => toggleExercise("likedExercises", f)}
                  />
                ))}
              </div>
            </div>
          ))}
          <Input
            placeholder="Add your own (comma separated)"
            value={data.training.likedExercisesOther ?? ""}
            onChange={(e) => upd("training", { likedExercisesOther: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Exercises you dislike — pick any</Label>
        <div className="mt-2 space-y-3">
          {EXERCISE_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{cat.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.exercises.map((f) => (
                  <Chip
                    key={f}
                    label={f}
                    active={data.training.dislikedExercises.includes(f)}
                    onClick={() => toggleExercise("dislikedExercises", f)}
                  />
                ))}
              </div>
            </div>
          ))}
          <Input
            placeholder="Add your own (comma separated)"
            value={data.training.dislikedExercisesOther ?? ""}
            onChange={(e) => upd("training", { dislikedExercisesOther: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Injuries & limitations (required)
        </Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {INJURY_TAGS.map((t) => (
            <Chip
              key={t}
              label={t}
              active={data.training.injuryTags.includes(t)}
              onClick={() => toggleInjury(t)}
            />
          ))}
        </div>
        <Input
          className="mt-2"
          placeholder="Anything else? (comma separated)"
          value={data.training.injuries}
          onChange={(e) => upd("training", { injuries: e.target.value })}
        />
      </div>

      <div>
        <Label>Movements to avoid</Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {AVOID_TAGS.map((t) => (
            <Chip
              key={t}
              label={t}
              active={data.training.avoidTags.includes(t)}
              onClick={() => toggleAvoid(t)}
            />
          ))}
        </div>
        <Input
          className="mt-2"
          placeholder="Anything else?"
          value={data.training.avoidTagsOther ?? ""}
          onChange={(e) => upd("training", { avoidTagsOther: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Cardio</Label>
          <Input
            placeholder="type"
            value={data.training.cardioPreference ?? ""}
            onChange={(e) => upd("training", { cardioPreference: e.target.value })}
          />
        </div>
        <div>
          <Label>Steps goal</Label>
          <Input
            placeholder="steps/day"
            value={data.training.stepsGoal ?? ""}
            onChange={(e) => upd("training", { stepsGoal: e.target.value })}
          />
        </div>
        <div>
          <Label>Rest-day activity</Label>
          <Input
            placeholder="e.g. walking"
            value={data.training.restDayActivity ?? ""}
            onChange={(e) => upd("training", { restDayActivity: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function StepConstraints({ data, upd }: StepProps) {
  const eq = data.constraints.equipment ?? [];
  function toggle(v: string) {
    const set = new Set(eq);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    upd("constraints", { equipment: [...set] });
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Training experience</Label>
          <Select
            value={data.constraints.experience}
            onValueChange={(v) => upd("constraints", { experience: v as any })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Warm-up minutes / session</Label>
          <Input
            type="number"
            value={data.constraints.warmupMinutes ?? ""}
            onChange={(e) =>
              upd("constraints", {
                warmupMinutes: Number(e.target.value) || undefined,
              })
            }
          />
        </div>
      </div>
      <div>
        <Label>Where do you train?</Label>
        <Select
          value={data.constraints.environment}
          onValueChange={(v) => upd("constraints", { environment: v as any })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="gym">Gym</SelectItem>
            <SelectItem value="home">Home</SelectItem>
            <SelectItem value="outdoor">Outdoor</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Available equipment</Label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EQUIPMENT_OPTIONS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <Checkbox checked={eq.includes(k)} onCheckedChange={() => toggle(k)} />
              <span className="capitalize">{k}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label>Travel frequency</Label>
        <Input
          placeholder="e.g. 1 week per month"
          value={data.constraints.travelFrequency ?? ""}
          onChange={(e) => upd("constraints", { travelFrequency: e.target.value })}
        />
      </div>
    </div>
  );
}

function StepHealth({ data, upd }: StepProps) {
  const flagged =
    !!(data.health.conditions?.trim() ||
      data.health.medications?.trim() ||
      (data.health.pregnancyPostpartum && data.health.pregnancyPostpartum !== "none"));
  return (
    <div className="space-y-4">
      <div>
        <Label>Diagnosed medical conditions</Label>
        <Textarea
          placeholder="e.g. heart condition, hypertension, disc herniation — or leave blank"
          value={data.health.conditions ?? ""}
          onChange={(e) => upd("health", { conditions: e.target.value })}
        />
      </div>
      <div>
        <Label>Medications that affect training</Label>
        <Input
          value={data.health.medications ?? ""}
          onChange={(e) => upd("health", { medications: e.target.value })}
        />
      </div>
      <div>
        <Label>Pregnancy / postpartum</Label>
        <Select
          value={data.health.pregnancyPostpartum ?? "none"}
          onValueChange={(v) => upd("health", { pregnancyPostpartum: v as any })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None / not applicable</SelectItem>
            <SelectItem value="pregnant">Pregnant</SelectItem>
            <SelectItem value="postpartum">Postpartum</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {flagged && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You've indicated a medical condition, medication, or pregnancy/postpartum status.
            Please consult a doctor or certified coach before starting any plan.
            SmartyWorkout is a general wellness tool, not medical advice.
          </AlertDescription>
        </Alert>
      )}
      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          checked={data.health.disclaimerAcknowledged}
          onCheckedChange={(v) => upd("health", { disclaimerAcknowledged: v === true })}
        />
        <span>
          I understand SmartyWorkout is not medical advice and I take responsibility for
          consulting a healthcare professional if needed.
        </span>
      </label>
    </div>
  );
}

function StepNotes({
  data,
  setNotes,
  durationWeeks,
  setDurationWeeks,
}: {
  data: QuestionnaireData;
  setNotes: (v: string) => void;
  durationWeeks: 1 | 2 | 4;
  setDurationWeeks: (v: 1 | 2 | 4) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Anything else we should know?</Label>
        <Textarea
          rows={5}
          placeholder="Free-text notes — anything that matters for your plan"
          value={data.notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div>
        <Label>Plan duration</Label>
        <RadioGroup
          value={String(durationWeeks)}
          onValueChange={(v) => setDurationWeeks(Number(v) as 1 | 2 | 4)}
          className="mt-2 grid grid-cols-3 gap-2"
        >
          {[1, 2, 4].map((w) => (
            <label
              key={w}
              className={`flex cursor-pointer flex-col items-center rounded-lg border p-3 text-sm ${
                Number(durationWeeks) === w ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <RadioGroupItem value={String(w)} className="sr-only" />
              <span className="text-lg font-bold">{w}</span>
              <span className="text-xs text-muted-foreground">
                {w === 1 ? "week" : "weeks"}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
