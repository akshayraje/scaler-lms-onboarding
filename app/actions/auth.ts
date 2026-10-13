"use server";

import { audit } from "@/lib/audit";
import { signIn, signOut } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/lib/session";

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeCallbackPath(formData.get("callbackUrl")) });
}

export async function signOutAction() {
  // Audit here: Auth.js's signOut event doesn't receive the user with the Drizzle adapter.
  const user = await getCurrentUser();
  if (user) await audit({ userId: user.id, email: user.email, action: "logout" });
  await signOut({ redirectTo: "/login" });
}
