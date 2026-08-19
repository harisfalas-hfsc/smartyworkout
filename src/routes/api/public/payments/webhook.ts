import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function priceInfo(subscription: any) {
  const item = subscription.items?.data?.[0];
  return {
    priceId:
      item?.price?.lookup_key ||
      item?.price?.metadata?.lovable_external_id ||
      item?.price?.id ||
      null,
    productId: typeof item?.price?.product === "string" ? item.price.product : null,
    periodStart: item?.current_period_start ?? subscription.current_period_start,
    periodEnd: item?.current_period_end ?? subscription.current_period_end,
  };
}

/**
 * Reads what we already stored so an out-of-order redelivery can be rejected
 * before it overwrites a newer state.
 */
async function storedSubscription(subscriptionId: string, env: StripeEnv) {
  const { data } = await getSupabase()
    .from("subscriptions")
    .select("status, updated_at, last_event_at, current_period_end")
    .eq("provider_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();
  return (data as StoredSubscription) ?? null;
}

async function upsertSubscription(subscription: any, env: StripeEnv, eventCreatedAt: number | null) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  const stored = await storedSubscription(subscription.id, env);
  const decision = shouldApplySubscriptionEvent(stored, {
    createdAt: eventCreatedAt,
    status: subscription.status,
  });
  if (!decision.apply) {
    console.log(`[payments-webhook] skipped ${subscription.id}: ${decision.reason}`);
    return;
  }

  const { priceId, productId, periodStart, periodEnd } = priceInfo(subscription);

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        provider: "stripe",
        provider_subscription_id: subscription.id,
        provider_customer_id: subscription.customer,
        price_id: priceId,
        product_id: productId,
        status: subscription.status,
        current_period_start: isoFromUnix(periodStart),
        current_period_end: isoFromUnix(periodEnd),
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        environment: env,
        last_event_at: eventCreatedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_subscription_id" },
    );

  await adminAlert({
    kind: "Membership",
    title: `Membership ${subscription.status}`,
    details: `Subscription ${subscription.id} for user ${userId} is now "${subscription.status}"${
      subscription.cancel_at_period_end ? " (set to cancel at period end)" : ""
    }.`,
    dedupeKey: billingDedupeKey({
      kind: "sub",
      objectId: subscription.id,
      state: `${subscription.status}-${subscription.cancel_at_period_end ? 1 : 0}`,
    }),
  });
}

/** Admin-side alert: emails the support mailbox. Never breaks the webhook. */
async function adminAlert(input: {
  kind: string;
  title: string;
  details: string;
  dedupeKey: string;
}) {
  try {
    const { notifyAdmins } = await import("@/lib/admin-alert.server");
    await notifyAdmins({ ...input, link: "https://smartyworkout.com/admin" });
  } catch (e) {
    console.error("[payments-webhook] admin alert failed:", e);
  }
}


async function markCanceled(subscription: any, env: StripeEnv, eventCreatedAt: number | null) {
  const stored = await storedSubscription(subscription.id, env);
  const decision = shouldApplySubscriptionEvent(stored, {
    createdAt: eventCreatedAt,
    status: "canceled",
  });
  if (!decision.apply) {
    console.log(`[payments-webhook] skipped cancel of ${subscription.id}: ${decision.reason}`);
    return;
  }

  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      last_event_at: eventCreatedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("provider_subscription_id", subscription.id)
    .eq("environment", env);

  await adminAlert({
    kind: "Membership",
    title: "Membership canceled",
    details: `Subscription ${subscription.id} was canceled.`,
    dedupeKey: billingDedupeKey({ kind: "sub-canceled", objectId: subscription.id }),
  });
}


function euro(amount: number | null | undefined, currency: string | null | undefined): string {
  if (typeof amount !== "number") return "your membership";
  const value = (amount / 100).toFixed(2);
  return `${currency?.toUpperCase() === "EUR" ? "€" : `${currency?.toUpperCase() ?? ""} `}${value}`;
}

async function userIdForInvoice(invoice: any, env: StripeEnv): Promise<string | null> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return null;
  const { data } = await getSupabase()
    .from("subscriptions")
    .select("user_id")
    .eq("provider_customer_id", customerId)
    .eq("environment", env)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

async function handleInvoicePaid(invoice: any, env: StripeEnv) {
  if (!invoice.subscription && invoice.billing_reason === "manual") return;
  const userId = await userIdForInvoice(invoice, env);
  if (!userId) return;
  const { notifyOnce } = await import("@/lib/billing-notify.server");
  const amount = euro(invoice.amount_paid ?? invoice.total, invoice.currency);
  const nextDate = invoice.lines?.data?.[0]?.period?.end
    ? new Date(invoice.lines.data[0].period.end * 1000).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  await notifyOnce(getSupabase(), {
    userId,
    kind: "billing",
    title: "Thank you — your payment went through",
    body: `We received ${amount} for your Smarty Workout membership.${
      nextDate ? ` Your access is active until ${nextDate}.` : ""
    } Thank you for training with us — your receipt is on its way by email.`,
    dedupeKey: `invoice-paid:${invoice.id}`,
  });

  await adminAlert({
    kind: "Payment",
    title: `Payment received — ${amount}`,
    details: `Invoice ${invoice.id} paid by user ${userId}.${nextDate ? ` Next period ends ${nextDate}.` : ""}`,
    dedupeKey: `admin-invoice-paid-${invoice.id}`,
  });
}

async function handleInvoiceFailed(invoice: any, env: StripeEnv) {
  const userId = await userIdForInvoice(invoice, env);
  if (!userId) return;
  const { notifyOnce } = await import("@/lib/billing-notify.server");
  const attempt = Number(invoice.attempt_count ?? 1);
  const amount = euro(invoice.amount_due ?? invoice.total, invoice.currency);
  const nextAttempt = invoice.next_payment_attempt
    ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      })
    : null;
  const body = nextAttempt
    ? `We couldn't take ${amount} for your membership (attempt ${attempt}). This usually means the card expired, has insufficient funds, or the bank asked for confirmation. We'll try again automatically on ${nextAttempt}. To sort it out now — or to pay with a different card — open My account and update your payment method. Your access stays on in the meantime.`
    : `We couldn't take ${amount} for your membership (attempt ${attempt}). This was the last automatic attempt, so your membership will pause unless the payment is completed. Open My account to update your card and restart it — nothing in your profile, logbook or progress is lost.`;
  await notifyOnce(getSupabase(), {
    userId,
    kind: "billing",
    title: nextAttempt ? "Payment didn't go through" : "Payment failed — action needed",
    body,
    dedupeKey: `invoice-failed:${invoice.id}:${attempt}`,
  });

  await adminAlert({
    kind: "Payment",
    title: `Payment failed — ${amount}`,
    details: `Invoice ${invoice.id} failed for user ${userId} (attempt ${attempt}).`,
    dedupeKey: `admin-invoice-failed-${invoice.id}-${attempt}`,
  });
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled(event.data.object, env);
      break;
    case "invoice.paid":
    case "invoice.payment_succeeded":
      await handleInvoicePaid(event.data.object, env);
      break;
    case "invoice.payment_failed":
      await handleInvoiceFailed(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}


export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
