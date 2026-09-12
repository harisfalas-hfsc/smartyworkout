import type { Category } from "./spec";

/**
 * "Surprise me" contract — pure, deterministic, testable.
 *
 * A surprise session is always a real, normal training session:
 * never a break category, always intermediate (2 stars) and always
 * 40-50 minutes of training time regardless of the time chip.
 */

/** Break / low-intensity categories a surprise session must never pick. */
export const SURPRISE_EXCLUDED: Category[] = [
  "MICRO-WORKOUTS",
  "PILATES",
  "MOBILITY & STABILITY",
  "RECOVERY",
];

/** Allowed session lengths, in training minutes. Never less, never more. */
export const SURPRISE_MINUTES = [40, 45, 50] as const;

/** Requested difficulty for every surprise session. */
export const SURPRISE_STARS = 2;

/** Deterministic per athlete, per calendar day. */
export function surpriseSeed(userId: string, isoDate: string): number {
  const source = `${userId}:${isoDate}`;
  let seed = 0;
  for (let i = 0; i < source.length; i++) seed = (seed * 31 + source.charCodeAt(i)) >>> 0;
  return seed;
}

export type SurprisePlan = {
  category: Category;
  minutes: number;
  stars: number;
  bodyweightOnly: boolean;
};

export function surprisePlan(
  seed: number,
  allCategories: Category[],
  recentCategories: string[],
): SurprisePlan {
  const pool = allCategories.filter((c) => !SURPRISE_EXCLUDED.includes(c));
  const recent = new Set(recentCategories.slice(0, 2));
  const fresh = pool.filter((c) => !recent.has(c));
  const choices = fresh.length ? fresh : pool;
  return {
    category: choices[seed % choices.length]!,
    minutes: SURPRISE_MINUTES[seed % SURPRISE_MINUTES.length]!,
    stars: SURPRISE_STARS,
    // Alternate between an equipped session and a bodyweight-only session.
    bodyweightOnly: seed % 2 === 1,
  };
}
