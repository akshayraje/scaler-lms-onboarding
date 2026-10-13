import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { audit } from "./audit";
import { db } from "./db";
import { account, session, user } from "./db/schema";
import { COMPANY_DOMAIN, isAllowedGoogleProfile, isBootstrapAdmin } from "./domain";

export { COMPANY_DOMAIN };

type Role = "learner" | "manager" | "admin";

declare module "next-auth" {
  interface User {
    role?: Role;
  }
  interface Session {
    user: { id: string; name: string; email: string; image: string | null; role: Role };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: user, accountsTable: account, sessionsTable: session }),
  // Self-hosted behind a proxy (Railway, nginx…): trust the forwarded Host header.
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Users imported from the legacy DB have no account row yet. Linking by email is
      // safe here because signIn below only admits verified addresses on our Workspace domain.
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { prompt: "select_account", ...(COMPANY_DOMAIN ? { hd: COMPANY_DOMAIN } : {}) },
      },
    }),
  ],
  session: { strategy: "database", maxAge: 60 * 60 * 12, updateAge: 60 * 60 }, // 12h, as before
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // `hd` in the auth URL is only a hint to Google's account chooser; this is the enforcement.
    // Runs before the user row is created, so rejected accounts never reach the DB.
    async signIn({ profile }) {
      const ok = isAllowedGoogleProfile(profile);
      if (!ok) await audit({ email: profile?.email, action: "login_denied", detail: `hd=${profile?.hd ?? ""}` });
      return ok;
    },
    // Shape of auth() and GET /api/auth/session. Build it explicitly: with database
    // sessions the incoming object also carries the raw sessionToken, which must not
    // be readable from page JavaScript.
    session({ session, user: u }) {
      return {
        expires: session.expires,
        user: { id: u.id!, name: u.name ?? u.email!, email: u.email!, image: u.image ?? null, role: u.role ?? "learner" },
      } as typeof session;
    },
  },
  events: {
    async signIn({ user: u, profile }) {
      if (!u.id || !u.email) return;
      await db
        .update(user)
        .set({
          lastLoginAt: new Date(),
          // Auth.js only copies name/photo at account creation; keep them in sync with Google.
          ...(profile?.name ? { name: profile.name } : {}),
          ...(typeof profile?.picture === "string" ? { image: profile.picture } : {}),
          ...(isBootstrapAdmin(u.email) ? { role: "admin" as const } : {}),
        })
        .where(eq(user.id, u.id));
      await audit({ userId: u.id, email: u.email, action: "login" });
    },
  },
});
