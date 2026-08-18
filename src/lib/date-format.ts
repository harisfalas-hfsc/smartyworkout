/**
 * One date standard for the whole app: day / month / year.
 * Never rely on the browser locale for ordering — 08/12 must always mean 8 December.
 */

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 12/08/2026 */
export function formatDate(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 12 Aug 2026 */
export function formatDateShort(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** 12 August 2026 */
export function formatDateLong(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** Wednesday 12 August 2026 */
export function formatWeekdayLong(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${WEEKDAYS_LONG[d.getDay()]} ${formatDateLong(d)}`;
}

/** 14:30 */
export function formatTime(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 12/08/2026 · 14:30 */
export function formatDateTime(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatDate(d)} · ${formatTime(d)}`;
}

/** August 2026 — calendar headers */
export function formatMonthYear(value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export type ScheduleTone = "missed" | "today" | "upcoming";

/** Red when the scheduled date has passed, blue for today, green for the future. */
export function scheduleTone(
  value: Date | string | number | null | undefined,
  completed = false,
): ScheduleTone | null {
  const d = toDate(value);
  if (!d || completed) return null;
  const now = new Date();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (day < today) return "missed";
  if (day === today) return "today";
  return "upcoming";
}

export const SCHEDULE_TONE_TEXT: Record<ScheduleTone, string> = {
  missed: "text-red-500",
  today: "text-blue-500",
  upcoming: "text-emerald-500",
};

export const SCHEDULE_TONE_DOT: Record<ScheduleTone, string> = {
  missed: "bg-red-500",
  today: "bg-blue-500",
  upcoming: "bg-emerald-500",
};

export const SCHEDULE_TONE_LABEL: Record<ScheduleTone, string> = {
  missed: "Missed",
  today: "Today",
  upcoming: "Scheduled",
};
