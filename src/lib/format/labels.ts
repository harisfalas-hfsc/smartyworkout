// One formatter per user-visible concept. Components must never hand-roll
// these strings, otherwise the same workout reads differently on two screens.

export const STAR_WORDS: Record<number, string> = {
  1: "Foundation",
  2: "Developing",
  3: "Advanced",
};

/** "2 stars · Developing" */
export function difficultyLabel(stars: number | null | undefined): string {
  const n = Number(stars);
  if (!Number.isFinite(n) || n < 1) return "Unrated";
  const clamped = Math.max(1, Math.min(3, Math.round(n)));
  return `${clamped} star${clamped === 1 ? "" : "s"} · ${STAR_WORDS[clamped]}`;
}

/** "45 min" / "1 h 15 min" */
export function durationLabel(minutes: number | null | undefined): string {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const mins = Math.round(n);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** Equipment badges, capped with a "+N" overflow so cards never wrap wildly. */
export function equipmentBadges(
  equipment: readonly string[] | null | undefined,
  max = 4,
): { shown: string[]; overflow: number } {
  const list = (equipment ?? []).map((e) => String(e).trim()).filter(Boolean);
  return { shown: list.slice(0, max), overflow: Math.max(0, list.length - max) };
}

/** "Bodyweight" when nothing is required. */
export function equipmentSummary(equipment: readonly string[] | null | undefined): string {
  const list = (equipment ?? []).filter(Boolean);
  return list.length ? list.join(", ") : "Bodyweight";
}

/** "3 logged sessions" — never "3 session(s)". */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
