export const INBOX_CHANGED_EVENT = "smarty:inbox-changed";

export type InboxSnapshot = {
  updatesUnread: number;
  messagesUnread: number;
};

export function announceInboxChanged(snapshot?: Partial<InboxSnapshot>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INBOX_CHANGED_EVENT, { detail: snapshot ?? {} }));
}
