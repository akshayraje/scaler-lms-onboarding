import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { enrollments, moduleProgress } from "./db/schema";

export async function getCompletedModules(userId: string, courseId: string): Promise<string[]> {
  const rows = await db
    .select({ moduleId: moduleProgress.moduleId })
    .from(moduleProgress)
    .where(and(eq(moduleProgress.userId, userId), eq(moduleProgress.courseId, courseId)));
  return rows.map((r) => r.moduleId);
}

/** Create the enrollment on first activity and move it to in_progress. */
export async function touchEnrollment(userId: string, courseId: string) {
  await db
    .insert(enrollments)
    .values({ userId, courseId, status: "in_progress", startedAt: new Date() })
    .onConflictDoUpdate({
      target: [enrollments.userId, enrollments.courseId],
      set: {
        status: sql`case when ${enrollments.status} = 'completed' then ${enrollments.status} else 'in_progress' end`,
        startedAt: sql`coalesce(${enrollments.startedAt}, now())`,
      },
    });
}

export type CourseSummary = { doneIds: string[]; certified: boolean; renewalDue: boolean; validUntil: Date | null };

/** Per-course progress summary for the learner dashboard. */
export async function getDashboardSummary(userId: string): Promise<Map<string, CourseSummary>> {
  const rows = await db.execute<{ course_id: string; done_ids: string[]; issued: boolean; valid_until: Date | null; valid: boolean }>(sql`
    select c.id as course_id,
           coalesce((select array_agg(mp.module_id) from module_progress mp where mp.user_id = ${userId} and mp.course_id = c.id), '{}') as done_ids,
           lc.code is not null as issued,
           lc.expires_at as valid_until,
           (lc.code is not null and (lc.expires_at is null or lc.expires_at > now())) as valid
    from courses c
    left join lateral (
      select code, expires_at from certificates ce
      where ce.user_id = ${userId} and ce.course_id = c.id
      order by issued_at desc limit 1
    ) lc on true
  `);
  return new Map(
    rows.rows.map((r) => [
      r.course_id,
      { doneIds: r.done_ids, certified: r.valid, renewalDue: r.issued && !r.valid, validUntil: r.valid_until },
    ]),
  );
}
