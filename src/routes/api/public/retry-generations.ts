import { createFileRoute } from "@tanstack/react-router";

function authorised(request: Request): boolean {
  const secret = process.env["CRON_SECRET"] || process.env["DAILY_RUN_SECRET"] || "";
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim() === secret;
}

async function run(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });
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
