/**
 * PAR-Q waiver acknowledgement for the current browsing session.
 *
 * The waiver dialog is driven by data that can refresh more than once per page
 * (cache first, then network). Without a memory of the confirmation, a refresh
 * re-opens the dialog and the athlete has to confirm two or three times.
 * One confirmation now covers the whole session.
 */
const KEY = "smarty:parq-ack";

export function hasParqAck(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setParqAck(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    /* private mode — the dialog simply asks again */
  }
}

export function clearParqAck(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
