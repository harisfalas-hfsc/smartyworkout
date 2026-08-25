import { createServerFn } from "@tanstack/react-start";

/**
 * Records a problem that happened inside the app on a member's device
 * (page crash, failed action) so the admin gets the same instant alert as for
 * server failures. Public on purpose — the browser must be able to report a
 * crash even when the session is gone; the payload is size-capped and only ever
 * written to the admin-only error log.
 */
export const reportClientProblem = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      message: string;
      source?: string;
      route?: string;
      userId?: string | null;
      userEmail?: string | null;
      details?: Record<string, unknown>;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { reportError } = await import("@/lib/errors/report.server");
    await reportError({
      kind: "client",
      source: (data.source || "app").slice(0, 60),
      message: (data.message || "Unknown app error").slice(0, 300),
      ...(data.route ? { route: data.route.slice(0, 200) } : {}),
      userId: data.userId ?? null,
      userEmail: data.userEmail ?? null,
      details: data.details ?? {},
    });
    return { ok: true };
  });
