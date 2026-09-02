import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Key of the single app_settings row that drives Global Free Access Mode. */
export const FREE_ACCESS_SETTING_KEY = "free_access_mode";

let cached: boolean | null = null;
let inFlight: Promise<boolean> | null = null;
const subscribers = new Set<(value: boolean) => void>();

function publish(value: boolean) {
  cached = value;
  for (const fn of subscribers) fn(value);
}

/**
 * Reads the free access flag once per session (deduped + cached).
 * Fails closed: any error means normal paid behaviour.
 */
export async function fetchFreeAccessMode(force = false): Promise<boolean> {
  if (!force && cached !== null) return cached;
  if (!force && inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", FREE_ACCESS_SETTING_KEY)
        .maybeSingle();
      if (error) return false;
      return (data as { value?: unknown } | null)?.value === true;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();
  const value = await inFlight;
  publish(value);
  return value;
}

/**
 * Seeds the cache from a server-rendered value (root loader) so the first
 * render already knows the mode. Safe to call during render.
 */
export function seedFreeAccessMode(value: boolean) {
  if (cached === value) return;
  cached = value;
  for (const fn of subscribers) fn(value);
}

/** Pushes a new value to every listener instantly (used by the admin toggle). */
export function setFreeAccessModeCache(value: boolean) {
  publish(value);
}

export function useFreeAccessMode(): { freeAccessMode: boolean; loading: boolean } {
  const [freeAccessMode, setValue] = useState<boolean>(cached ?? false);
  const [loading, setLoading] = useState<boolean>(cached === null);

  useEffect(() => {
    let active = true;
    const listener = (v: boolean) => {
      if (active) setValue(v);
    };
    subscribers.add(listener);
    void fetchFreeAccessMode()
      .then((v) => {
        if (active) {
          setValue(v);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      subscribers.delete(listener);
    };
  }, []);

  return { freeAccessMode, loading };
}
