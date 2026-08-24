import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently deletes the signed-in athlete's account and all their data.
 * Cascading foreign keys on auth.users remove workouts, profile, notifications, etc.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { confirm: string }) => {
    if (data.confirm !== "DELETE") throw new Error("Type DELETE to confirm");
    return data;
  })
  .handler(async ({ context }): Promise<{ ok: true } | { error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims?.email as string | undefined) ?? context.userId;

    // Stop billing before the account (and its access) disappears.
    let billing: { canceled: string[]; failures: string[] } = { canceled: [], failures: [] };
    try {
      const { cancelSubscriptionsImmediately } = await import("@/lib/subscription-cancel.server");
      billing = await cancelSubscriptionsImmediately(context.supabase as never, context.userId);
    } catch {
      billing = { canceled: [], failures: ["Subscription cancellation step failed"] };
    }

    if (billing.failures.length) {
      try {
        const { notifyAdmins } = await import("@/lib/admin-alert.server");
        await notifyAdmins({
          kind: "Member",
          title: "Subscription cancellation failed on account deletion",
          details: `${email} deleted their account, but their subscription could not be canceled automatically: ${billing.failures.join("; ")}. Cancel it manually in Stripe.`,
          link: "https://smartyworkout.com/admin",
          dedupeKey: `sub-cancel-failed-${context.userId}`,
        });
      } catch {
        /* alerts never block the action */
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) return { error: error.message };

    try {
      const { notifyAdmins } = await import("@/lib/admin-alert.server");
      await notifyAdmins({
        kind: "Member",
        title: "Account deleted",
        details: `${email} deleted their Smarty Workout account.`,
        link: "https://smartyworkout.com/admin",
        dedupeKey: `account-deleted-${context.userId}`,
      });
    } catch {
      /* alerts never block the action */
    }
    return { ok: true };
  });

/**
 * Fires once, when a member finishes their Training Profile for the first time,
 * so the administrator gets an email about the new active member.
 */
export const announceNewMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    try {
      const email = (context.claims?.email as string | undefined) ?? context.userId;
      const { notifyAdmins } = await import("@/lib/admin-alert.server");
      await notifyAdmins({
        kind: "Member",
        title: "New member onboarded",
        details: `${email} completed their Training Profile.`,
        link: "https://smartyworkout.com/admin",
        dedupeKey: `new-member-${context.userId}`,
      });
    } catch {
      /* alerts never block onboarding */
    }
    return { ok: true };
  });
