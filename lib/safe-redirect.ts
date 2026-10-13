/** Only allow same-site relative paths as post-login destinations (no open redirects). */
export function safeCallbackPath(v: unknown): string {
  if (typeof v !== "string" || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/";
  if (v.startsWith("/login") || v.startsWith("/api/")) return "/";
  return v;
}
