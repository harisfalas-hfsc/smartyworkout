import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Progress is a section of the logbook now — one place for history, calendar
 * and progress. The old address keeps working.
 */
export const Route = createFileRoute("/_authenticated/progress")({
  beforeLoad: () => {
    throw redirect({
      to: "/logbook",
      search: { filter: "all", view: "progress" as const },
    });
  },
});
