import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/messages")({
  beforeLoad: () => {
    throw redirect({ to: "/inbox", search: { tab: "messages" as const, compose: false } });
  },
  component: () => null,
});
