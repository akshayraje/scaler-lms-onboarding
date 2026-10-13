import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "learner" | "manager" | "admin";
  isAdmin: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const s = await auth();
  if (!s?.user) return null;
  return { ...s.user, isAdmin: s.user.role === "admin" };
});

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) {
    // Come back to the requested page after signing in (path set by proxy.ts).
    const path = (await headers()).get("x-pathname");
    redirect(path && path !== "/" ? `/login?callbackUrl=${encodeURIComponent(path)}` : "/login");
  }
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  if (!u.isAdmin) redirect("/");
  return u;
}
