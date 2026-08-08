/** Emails that always get admin access in the app. */
export const ADMIN_EMAILS = [
  "harisfalas@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
