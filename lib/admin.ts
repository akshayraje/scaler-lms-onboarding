import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { auditLog } from "./db/schema";

export type RosterRow = {
  name: string;
  email: string;
  last_login_at: Date | null;
  done: number;
  exam_score: number | null;
  cert_code: string | null;
  cert_expires_at: Date | null;
  /** Latest certificate exists and hasn't expired. */
  cert_valid: boolean;
};

/** One row per user for a course. `moduleIds` = the course's current modules, so removed ones aren't counted. */
export async function getRoster(courseId: string, moduleIds: string[]): Promise<RosterRow[]> {
  const res = await db.execute<RosterRow>(sql`
    select coalesce(u.name, u.email) as name, u.email, u.last_login_at,
           coalesce(p.done, 0)::int as done,
           a.score as exam_score,
           c.code as cert_code,
           c.expires_at as cert_expires_at,
           (c.code is not null and (c.expires_at is null or c.expires_at > now())) as cert_valid
    from "user" u
    left join (
      select user_id, count(*) as done from module_progress
      where course_id = ${courseId} and module_id in ${moduleIds} group by user_id
    ) p on p.user_id = u.id
    left join lateral (
      select score from assessment_attempts
      where user_id = u.id and course_id = ${courseId} order by submitted_at desc limit 1
    ) a on true
    left join lateral (
      select code, expires_at from certificates
      where user_id = u.id and course_id = ${courseId} order by issued_at desc limit 1
    ) c on true
    order by u.last_login_at desc nulls last
  `);
  return res.rows;
}

export async function getAuditLog(limit = 200, courseId?: string) {
  const q = db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(Math.min(limit, 1000));
  return courseId ? q.where(eq(auditLog.courseId, courseId)) : q;
}
