import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Bell, MessageSquare } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { UpdatesPanel } from "@/components/inbox/UpdatesPanel";
import { ConversationsPanel } from "@/components/inbox/ConversationsPanel";

const searchSchema = z.object({
  tab: z.enum(["updates", "messages"]).catch("updates"),
  compose: z.boolean().catch(false),
});

export const Route = createFileRoute("/_authenticated/inbox")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Inbox — Smarty Workout" },
      {
        name: "description",
        content:
          "One place for your daily motivation, workout alerts and your conversations with the Smarty Workout team.",
      },
      { property: "og:title", content: "Inbox — Smarty Workout" },
      {
        property: "og:description",
        content: "Notifications and support conversations, together in one simple inbox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const { tab, compose } = Route.useSearch();
  const navigate = useNavigate();
  const [updatesUnread, setUpdatesUnread] = useState(0);
  const [messagesUnread, setMessagesUnread] = useState(0);

  const go = (next: "updates" | "messages") =>
    navigate({ to: "/inbox", search: { tab: next, compose: false }, replace: true });

  const onUpdates = useCallback((n: number) => setUpdatesUnread(n), []);
  const onMessages = useCallback((n: number) => setMessagesUnread(n), []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12 lg:max-w-6xl lg:px-8 lg:py-16">
      <PageHeader
        className="mb-5"
        eyebrow="Inbox"
        title="Inbox"
        subtitle="Your notifications and your conversations with the team — all in one place."
      />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <TabButton
          active={tab === "updates"}
          onClick={() => go("updates")}
          Icon={Bell}
          label="Notifications"
          count={updatesUnread}
        />
        <TabButton
          active={tab === "messages"}
          onClick={() => go("messages")}
          Icon={MessageSquare}
          label="Messages"
          count={messagesUnread}
        />
      </div>

      <div className={tab === "updates" ? "" : "hidden"}>
        <UpdatesPanel onUnread={onUpdates} />
      </div>
      <div className={tab === "messages" ? "" : "hidden"}>
        <ConversationsPanel onUnread={onMessages} defaultComposing={compose} />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof Bell;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count > 0 && (
        <span
          className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold ${
            active ? "bg-primary-foreground text-primary" : "bg-destructive text-destructive-foreground"
          }`}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
