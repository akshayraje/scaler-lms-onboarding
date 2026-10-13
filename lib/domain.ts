// Pure access rules, kept free of next-auth imports so they can be unit-tested.

export const COMPANY_DOMAIN = (process.env.COMPANY_DOMAIN ?? "").toLowerCase();

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isAllowedEmail(email: string | null | undefined) {
  return !!email && !!COMPANY_DOMAIN && email.toLowerCase().endsWith("@" + COMPANY_DOMAIN);
}

export function isBootstrapAdmin(email: string) {
  return ADMIN_EMAILS.has(email.toLowerCase());
}

/** Domain lock applied to the Google profile on every sign-in. */
export function isAllowedGoogleProfile(profile: { email?: string | null; email_verified?: unknown; hd?: unknown } | undefined) {
  return (
    profile?.email_verified === true &&
    typeof profile.hd === "string" &&
    profile.hd.toLowerCase() === COMPANY_DOMAIN &&
    isAllowedEmail(profile.email)
  );
}
