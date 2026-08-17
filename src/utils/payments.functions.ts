import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };
type PortalSessionResult = { url: string } | { error: string };

export type MembershipSummary = {
  active: boolean;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  priceLabel: string;
};

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length && found.data[0]) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    const { isFreeAccessMode, FREE_ACCESS_BLOCK } = await import("@/lib/free-access.server");
    if (await isFreeAccessMode()) {
      throw new Response(JSON.stringify(FREE_ACCESS_BLOCK), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    try {
      const { supabase, userId } = context;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const stripePrice = prices.data[0];
      if (!stripePrice) throw new Error("Price not found");
      const isRecurring = stripePrice.type === "recurring";

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        managed_payments: { enabled: true },
        metadata: { userId, managed_payments: "true" },
        ...(isRecurring && { subscription_data: { metadata: { userId } } }),
      } as never);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const customerId = (sub as { provider_customer_id?: string } | null)?.provider_customer_id;
    if (!customerId) return { error: "No subscription found" };

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

async function latestSubscriptionRow(
  supabase: { from: (t: string) => any },
  userId: string,
  environment: StripeEnv,
) {
  const { data } = await supabase
    .from("subscriptions")
    .select("provider_customer_id,provider_subscription_id,status,cancel_at_period_end,current_period_end")
    .eq("user_id", userId)
    .eq("environment", environment)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as {
    provider_customer_id?: string | null;
    provider_subscription_id?: string | null;
    status?: string | null;
    cancel_at_period_end?: boolean | null;
    current_period_end?: string | null;
  } | null;
}

export const getMembershipSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<MembershipSummary> => {
    const row = await latestSubscriptionRow(
      context.supabase as never,
      context.userId,
      data.environment,
    );
    const end = row?.current_period_end ? new Date(row.current_period_end).getTime() : null;
    const active = Boolean(
      row &&
        ["active", "trialing"].includes(row.status ?? "") &&
        (!end || Number.isNaN(end) || end > Date.now()),
    );
    return {
      active,
      status: row?.status ?? null,
      cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
      currentPeriodEnd: row?.current_period_end ?? null,
      priceLabel: "€9.99 / month",
    };
  });

export const setMembershipCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { cancel: boolean; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const row = await latestSubscriptionRow(
      context.supabase as never,
      context.userId,
      data.environment,
    );
    const subId = row?.provider_subscription_id;
    if (!subId) return { error: "No active membership found" };
    try {
      const stripe = createStripeClient(data.environment);
      await stripe.subscriptions.update(subId, { cancel_at_period_end: data.cancel });
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
