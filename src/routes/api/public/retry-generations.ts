import { createFileRoute } from "@tanstack/react-router";

async function authorised(request: Request): Promise<boolean> {
  const presented = (
    request.headers.get("x-daily-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    ""
  ).trim();
  if (!presented) return false;
  const envSecret = (process.env["CRON_SECRET"] || process.env["DAILY_RUN_SECRET"] || "").trim();
  if (envSecret && presented === envSecret) return true;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "daily_run_token")
    .maybeSingle();
  const token = (row as { value?: { token?: string } } | null)?.value?.token ?? "";
  return Boolean(token) && presented === token;
}

async function run(request: Request) {
  if (!(await authorised(request))) return new Response("Unauthorized", { status: 401 });
  const { retryPendingGenerations } = await import("@/lib/workout-generation.server");
  try {
    const result = await retryPendingGenerations(5);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/retry-generations")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
