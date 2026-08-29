import { supabase } from "@/integrations/supabase/client";

/**
 * One sign-out path for the whole app: forget the small profile hint kept for
 * the avatar, then clear the session.
 */
export async function signOutAndClearDevice(
  userId?: string | null,
  _email?: string | null,
): Promise<void> {
  try {
    if (userId) localStorage.removeItem(`smarty:profile:${userId}`);
  } catch {
    /* clearing is best-effort, signing out is not */
  }
  await supabase.auth.signOut();
}
