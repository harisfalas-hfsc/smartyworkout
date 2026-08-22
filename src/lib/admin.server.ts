/**
 * Server-only admin allow-list.
 * Kept in a *.server.ts module so these addresses are never shipped in the
 * client bundle. Client code must resolve admin status through a server call.
 */
export const ADMIN_EMAILS = [
  "harisfalas@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
