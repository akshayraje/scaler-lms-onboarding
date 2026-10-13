/**
 * One-off import from the original Vercel Postgres schema
 * (users / progress / exam_attempts / certificates / audit_log) into this app.
 *
 *   LEGACY_DATABASE_URL=postgres://... DATABASE_URL=postgres://... pnpm db:import-legacy
 *
 * Idempotent: users are matched by email, and re-running skips rows already
 * imported. Imported users have no Google account row yet; Auth.js links it
 * on their first sign-in (email account linking is enabled for Google).
 */
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { Client } from "pg";
import { poshPocso } from "../content/courses/posh-pocso/course";
import { db, pool } from "../lib/db";
import { getCourseSettings } from "../lib/course-settings-store";
import { addMonths } from "../lib/dates";
import { syncCourseCatalog } from "../lib/db/bootstrap";
import { runMigrations } from "../lib/db/migrate";
import {
  assessmentAttempts,
  auditLog,
  certificates,
  enrollments,
  moduleProgress,
  user,
} from "../lib/db/schema";

const COURSE = poshPocso;
const LEGACY_EXAM_TOTAL = 15; // the original exam had 15 questions

type LegacyUser = { id: number; email: string; name: string; first_login_at: Date; last_login_at: Date };

async function main() {
  const legacyUrl = process.env.LEGACY_DATABASE_URL;
  if (!legacyUrl) throw new Error("Set LEGACY_DATABASE_URL to the old database's connection string.");

  await runMigrations();
  await syncCourseCatalog();
  const { validityMonths } = (await getCourseSettings(COURSE.slug)).certificate;

  const legacy = new Client({ connectionString: legacyUrl });
  await legacy.connect();
  try {
    const { rows: users } = await legacy.query<LegacyUser>("select * from users order by id");
    const idMap = new Map<number, string>();

    for (const u of users) {
      const email = u.email.toLowerCase();
      const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
      if (existing) {
        idMap.set(u.id, existing.id);
        continue;
      }
      const id = crypto.randomUUID();
      await db.insert(user).values({
        id,
        email,
        name: u.name,
        emailVerified: u.first_login_at,
        createdAt: u.first_login_at,
        lastLoginAt: u.last_login_at,
      });
      idMap.set(u.id, id);
    }
    console.log(`users: ${users.length} (${idMap.size} mapped)`);

    const { rows: progress } = await legacy.query<{ user_id: number; module_id: number; completed_at: Date }>(
      "select * from progress",
    );
    let p = 0;
    for (const r of progress) {
      const userId = idMap.get(r.user_id);
      const mod = COURSE.modules[r.module_id];
      if (!userId || !mod) continue;
      const res = await db
        .insert(moduleProgress)
        .values({ userId, courseId: COURSE.slug, moduleId: mod.id, completedAt: r.completed_at })
        .onConflictDoNothing()
        .returning();
      p += res.length;
    }
    console.log(`progress: ${p} new of ${progress.length}`);

    // Attempts have no natural key, so only import them for users with none yet.
    const { rows: attempts } = await legacy.query<{ user_id: number; score: number; passed: boolean; submitted_at: Date }>(
      "select * from exam_attempts order by submitted_at",
    );
    const usersWithAttempts = new Set(
      (await db.select({ userId: assessmentAttempts.userId }).from(assessmentAttempts)).map((r) => r.userId),
    );
    let a = 0;
    for (const r of attempts) {
      const userId = idMap.get(r.user_id);
      if (!userId || usersWithAttempts.has(userId)) continue;
      await db.insert(assessmentAttempts).values({
        userId,
        courseId: COURSE.slug,
        courseVersion: COURSE.version,
        answers: null,
        score: r.score,
        correctCount: Math.round((r.score / 100) * LEGACY_EXAM_TOTAL),
        total: LEGACY_EXAM_TOTAL,
        passed: r.passed,
        submittedAt: r.submitted_at,
      });
      a++;
    }
    console.log(`exam attempts: ${a} imported`);

    const { rows: certs } = await legacy.query<{ user_id: number; cert_code: string; score: number; issued_at: Date }>(
      "select * from certificates",
    );
    let c = 0;
    for (const r of certs) {
      const userId = idMap.get(r.user_id);
      if (!userId) continue;
      const res = await db
        .insert(certificates)
        .values({
          userId,
          courseId: COURSE.slug,
          courseVersion: COURSE.version,
          code: r.cert_code,
          score: r.score,
          issuedAt: r.issued_at,
          expiresAt: validityMonths ? addMonths(r.issued_at, validityMonths) : null,
        })
        .onConflictDoNothing()
        .returning();
      c += res.length;
    }
    console.log(`certificates: ${c} new of ${certs.length}`);

    // Enrollments derived from what each user has done.
    const certified = new Map(certs.map((r) => [idMap.get(r.user_id), r.issued_at]));
    const started = new Map<string, Date>();
    for (const r of progress) {
      const userId = idMap.get(r.user_id);
      if (!userId) continue;
      const prev = started.get(userId);
      if (!prev || r.completed_at < prev) started.set(userId, r.completed_at);
    }
    for (const [userId, startedAt] of started) {
      const completedAt = certified.get(userId) ?? null;
      await db
        .insert(enrollments)
        .values({ userId, courseId: COURSE.slug, status: completedAt ? "completed" : "in_progress", startedAt, completedAt })
        .onConflictDoNothing();
    }
    console.log(`enrollments: ${started.size}`);

    if (await db.$count(auditLog)) {
      console.log("audit_log: target not empty, skipping (already imported or app in use)");
    } else {
      const { rows: logs } = await legacy.query<{
        user_id: number | null;
        email: string | null;
        action: string;
        detail: string | null;
        ip: string | null;
        created_at: Date;
      }>("select * from audit_log order by id");
      for (const r of logs) {
        await db.insert(auditLog).values({
          userId: r.user_id != null ? (idMap.get(r.user_id) ?? null) : null,
          email: r.email,
          action: r.action,
          courseId: r.action.startsWith("module") || r.action.startsWith("exam") || r.action.startsWith("certificate") ? COURSE.slug : null,
          detail: r.detail,
          ip: r.ip,
          createdAt: r.created_at,
        });
      }
      console.log(`audit_log: ${logs.length} imported`);
    }
  } finally {
    await legacy.end();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
