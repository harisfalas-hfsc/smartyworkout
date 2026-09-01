import { createFileRoute } from "@tanstack/react-router";

function authorised(request: Request): boolean {
  const secret = process.env["CRON_SECRET"] || process.env["DAILY_RUN_SECRET"] || "";
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim() === secret;
}

async function run(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });
  const { retryPendingGenerations, sweepAbandonedGenerations } = await import(
    "@/lib/workout-generation.server"
  );
  try {
    const retried = await retryPendingGenerations(10);
    const swept = await sweepAbandonedGenerations(25);
    return Response.json({ ok: true, ...retried, ...swept });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/recover-abandoned")({
  server: { handlers: { POST: ({ request }) => run(request), GET: ({ request }) => run(request) } },
});
