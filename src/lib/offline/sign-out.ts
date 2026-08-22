import { supabase } from "@/integrations/supabase/client";
import { clearCacheForUser } from "./store";
import { forgetDevice } from "./device-auth";
import { forgetNativeSession } from "./native-boot";

/**
 * One sign-out path for the whole app.
 *
 * Multi-user isolation: the leaving member's private offline copy (workouts,
 * logbook, inbox, progress, community detail, profile) is deleted from this
 * device before the session is cleared, so the next person to sign in on the
 * same phone or laptop can never see it. Public/static assets stay cached.
 */
export async function signOutAndClearDevice(
  userId?: string | null,
  email?: string | null,
): Promise<void> {
  try {
    await clearCacheForUser(userId);
    if (userId) localStorage.removeItem(`smarty:profile:${userId}`);
    forgetDevice(email);
    forgetNativeSession();
  } catch {
    /* clearing is best-effort, signing out is not */
  }
  await supabase.auth.signOut();
}
