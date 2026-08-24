import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type SupabaseLike = { from: (table: string) => any };

const ACTIVE_STATUSES = ["active", "trialing", "past_due", "incomplete", "paused"];

/**
 * Cancels the member's Stripe subscription immediately (not at period end).
 * Used right before an account is permanently deleted, so billing stops now.
 * Never throws — returns a description of what happened for admin logging.
 */
export async function cancelSubscriptionsImmediately(
  supabase: SupabaseLike,
  userId: string,
): Promise<{ canceled: string[]; failures: string[] }> {
  const canceled: string[] = [];
  const failures: string[] = [];

  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("provider_subscription_id,status,environment,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const rows = (data ?? []) as Array<{
      provider_subscription_id?: string | null;
      status?: string | null;
      environment?: string | null;
    }>;

    const seen = new Set<string>();
    for (const row of rows) {
      const subId = row.provider_subscription_id;
      if (!subId || seen.has(subId)) continue;
      if (!ACTIVE_STATUSES.includes(row.status ?? "")) continue;
      seen.add(subId);
      const environment = (row.environment === "live" ? "live" : "sandbox") as StripeEnv;
      try {
        const stripe = createStripeClient(environment);
        await stripe.subscriptions.cancel(subId);
        canceled.push(subId);
      } catch (error) {
        failures.push(`${subId}: ${getStripeErrorMessage(error)}`);
      }
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : "Subscription lookup failed");
  }

  return { canceled, failures };
}
