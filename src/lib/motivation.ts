// Deterministic daily motivation lines — same athlete, same day, same message.

const LINES: string[] = [
  "Show up today. The plan does the rest.",
  "Discipline is remembering what you actually want.",
  "You never regret the workout you did.",
  "Small session, real progress. Start it.",
  "Strength is built on ordinary days like this one.",
  "Twenty honest minutes beat a perfect hour you never start.",
  "Your body adapts to what you repeat. Repeat something good.",
  "Consistency is the only advanced technique.",
  "Move first, motivation follows.",
  "Train the person you want to be in a year.",
  "You are one session away from a better mood.",
  "Don't break the chain today.",
  "Progress hides inside the boring reps.",
  "Effort today, easier tomorrow.",
  "Nobody ever finished a workout and felt worse.",
  "You don't need to feel ready. You need to begin.",
  "Fatigue lies. Form doesn't. Train smart.",
  "Rest is part of training — but so is starting.",
  "The hardest set is the one you talk yourself out of.",
  "Be stubborn about the habit, flexible about the workout.",
  "Today counts twice: the training and the proof you keep promises.",
];

const STREAK_LINES: string[] = [
  "streak alive — keep it going.",
  "days in a row. That's momentum.",
  "sessions on the trot. Don't stop now.",
];

export function motivationFor(seedKey: string, streak = 0): { title: string; body: string } {
  let seed = 0;
  for (let i = 0; i < seedKey.length; i++) seed = (seed * 31 + seedKey.charCodeAt(i)) >>> 0;
  const body = LINES[seed % LINES.length]!;
  const title =
    streak >= 2
      ? `${streak}-day ${STREAK_LINES[seed % STREAK_LINES.length]!}`
      : "Good morning from Smarty Coach";
  return { title, body };
}
