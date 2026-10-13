import { redirect } from "next/navigation";
import { COMPANY_DOMAIN } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/lib/session";
import { GoogleSignInButton } from "./GoogleSignInButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in · Scaler" };

// Auth.js error codes (?error=...) → messages.
const ERRORS: Record<string, string> = {
  AccessDenied: `Only @${COMPANY_DOMAIN} Google Workspace accounts may sign in.`,
  Configuration: "Sign-in is misconfigured on the server. Please contact your administrator.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  const next = safeCallbackPath(callbackUrl);
  if (await getCurrentUser()) redirect(next);
  const message = error ? (ERRORS[error] ?? `Sign-in failed (${error}). Please try again.`) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_720px_520px_at_50%_35%,#e4ecfb_0%,var(--background)_70%)] px-4 py-6">
      <div className="w-full max-w-[400px] rounded-xl border bg-card px-6 pt-10 pb-8 text-center sm:px-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mx-auto mb-7 h-[30px]" src="/scaler-logo.png" alt="Scaler" />
        <h1 className="mb-1.5 text-[26px] sm:text-[26px]">Welcome</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sign in with your Scaler Google Workspace account to continue.</p>
        <GoogleSignInButton callbackUrl={next} />
        {message && (
          <div role="alert" className="mt-2.5 rounded-lg bg-danger-soft px-3.5 py-2.5 text-left text-[13px] text-danger-ink">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
