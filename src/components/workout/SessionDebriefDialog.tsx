import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { saveSessionFeedback, type SessionFeedback } from "@/lib/feedback.functions";
import { enqueueAction } from "@/lib/offline/queue";
import { useAuth } from "@/hooks/useAuth";
import { saveLocalFeedback } from "@/lib/offline/performance-store";

export const FEELING_OPTIONS = ["Excellent", "Good", "Normal", "Tired", "Exhausted"];
export const ENJOY_OPTIONS = ["Yes", "Neutral", "No"];
export const REPEAT_OPTIONS = ["Yes", "Maybe", "No"];

/**
 * Five simple cards, one question each. The whole debrief is optional and
 * never blocks completion. It writes ONE record per attempt, shared by the
 * player and the workout page.
 */
export function SessionDebriefDialog({
  open,
  onOpenChange,
  workoutId,
  attempt,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  attempt: number;
  initial?: SessionFeedback | null;
  onSaved?: (feedback: SessionFeedback) => void;
}) {
  const save = useServerFn(saveSessionFeedback);
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [rpe, setRpe] = useState<number | null>(null);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [enjoyed, setEnjoyed] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setRpe(initial?.rpe ?? null);
    setFeeling(initial?.feeling ?? null);
    setEnjoyed(initial?.enjoyed ?? null);
    setRepeat(initial?.wouldRepeat ?? null);
    setNote(initial?.note ?? "");
  }, [open, initial]);

  async function submit() {
    setSaving(true);
    const payload = {
      workoutId,
      attempt,
      rpe,
      feeling,
      enjoyed,
      wouldRepeat: repeat,
      note: note.trim() || null,
    };
    const feedback: SessionFeedback = {
      attempt,
      rpe,
      feeling,
      enjoyed,
      wouldRepeat: repeat,
      note: note.trim() || null,
      answeredAt: new Date().toISOString(),
    };
    if (user) {
      await saveLocalFeedback(user.id, workoutId, feedback);
      await enqueueAction("session-debrief", payload, user.id, 0);
      void save({ data: payload }).catch(() => undefined);
    }
    toast.success("Saved on this device.");
    setSaving(false);
    onSaved?.(feedback);
    onOpenChange(false);
  }

  const cards = [
    {
      title: "How hard was this workout?",
      hint: "1 = very easy, 10 = maximal effort.",
      body: (
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRpe(rpe === n ? null : n)}
              className={`h-12 rounded-xl border-2 text-sm font-bold transition ${
                rpe === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-blue-400/50 hover:border-primary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "How did you feel?",
      hint: "Your general state — this is not effort.",
      body: <Options options={FEELING_OPTIONS} value={feeling} onChange={setFeeling} />,
    },
    {
      title: "Did you enjoy the workout?",
      hint: "Helps Smarty Coach pick what you like.",
      body: <Options options={ENJOY_OPTIONS} value={enjoyed} onChange={setEnjoyed} />,
    },
    {
      title: "Would you do it again?",
      hint: "Helps Smarty Coach repeat or avoid this style.",
      body: <Options options={REPEAT_OPTIONS} value={repeat} onChange={setRepeat} />,
    },
    {
      title: "Anything Smarty Coach should remember?",
      hint: "Optional — you can skip this.",
      body: (
        <Textarea
          rows={3}
          value={note}
          placeholder="e.g. right shoulder felt tight on presses"
          onChange={(e) => setNote(e.target.value)}
        />
      ),
    },
  ];

  const card = cards[step]!;
  const last = step === cards.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-auto max-h-[85vh] min-h-[50vh] w-[calc(100%-2.5rem)] max-w-md overflow-y-auto rounded-3xl border-2 border-primary p-5 sm:p-6">
        <DialogHeader className="space-y-1 pb-1 text-left">
          <DialogTitle className="text-base font-bold">{card.title}</DialogTitle>
          <DialogDescription className="text-xs">{card.hint}</DialogDescription>
        </DialogHeader>

        <div className="flex-1">{card.body}</div>

        <div className="flex items-center gap-2">
          {step > 0 ? (
            <Button variant="secondary" className="h-11 flex-1 rounded-2xl" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="h-11 flex-1 rounded-2xl"
              onClick={() => onOpenChange(false)}
            >
              Skip
            </Button>
          )}
          <Button
            className="h-11 flex-1 rounded-2xl"
            disabled={saving}
            onClick={() => (last ? void submit() : setStep(step + 1))}
          >
            {last ? "Finish" : "Next"}
          </Button>
        </div>

        <div className="flex justify-center gap-1">
          {cards.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Options({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? null : o)}
          className={`h-12 rounded-xl border-2 px-3 text-sm font-semibold transition ${
            value === o
              ? "border-primary bg-primary text-primary-foreground"
              : "border-blue-400/50 hover:border-primary"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
