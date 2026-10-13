import "server-only";

// Absolute URLs for links that leave the app (notifications). The base is
// AUTH_URL — the app's public URL, also used for Google sign-in — and paths
// are built here so they stay in one place.

export function appBaseUrl() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Deep link to a course: lands on it, or goes through Google sign-in and back. */
export function courseUrl(slug: string) {
  return `${appBaseUrl()}/courses/${encodeURIComponent(slug)}`;
}
