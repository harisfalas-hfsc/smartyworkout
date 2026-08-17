// Server-side read of the Global Free Access Mode master switch.
// Fails closed (false = normal paid behaviour) on any error.
export const FREE_ACCESS_SETTING_KEY = "free_access_mode";

export async function isFreeAccessMode(): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("app_settings")
      .select("value")
      .eq("key", FREE_ACCESS_SETTING_KEY)
      .maybeSingle();
    return data?.value === true;
  } catch {
    return false;
  }
}

export async function setFreeAccessMode(value: boolean): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await (supabaseAdmin as any)
    .from("app_settings")
    .upsert(
      { key: FREE_ACCESS_SETTING_KEY, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
  return value;
}

/** JSON body returned by every billing entry point while the mode is ON. */
export const FREE_ACCESS_BLOCK = {
  error: "All content is currently free for signed-in members. No purchase is required.",
  freeAccessMode: true as const,
};
