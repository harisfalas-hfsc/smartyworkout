import { createFileRoute } from "@tanstack/react-router";

/**
 * Tiny reachability probe used by the offline core to tell
 * "device has no internet" apart from "backend unreachable".
 * Never cached, never touches the database.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true, at: Date.now() }), {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store, no-cache, must-revalidate",
          },
        }),
      HEAD: async () =>
        new Response(null, { headers: { "cache-control": "no-store" } }),
    },
  },
});
