"use client";

import { unstable_isUnrecognizedActionError } from "next/navigation";

/**
 * After a redeploy, a page that was already open still calls the previous build's server
 * actions, which the new server doesn't recognise. Saved progress is safe, so reload to get the
 * current build. Returns true if it's reloading (the caller should stop).
 */
export function reloadIfOutdated(e: unknown): boolean {
  if (!unstable_isUnrecognizedActionError(e)) return false;
  window.location.reload();
  return true;
}
