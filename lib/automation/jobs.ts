import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { jobRuns } from "@/lib/db/schema";
import { syncEmployees } from "./hrms";
import { dispatchNudges } from "./nudges";

// Registry of background jobs. Schedules are cron expressions in APP_TIMEZONE.

export type JobName = "hrms-sync" | "send-nudges";

export const JOBS: Record<JobName, { title: string; description: string; cron: string; schedule: string; run: (ctx: { runId: number }) => Promise<Record<string, unknown>> }> = {
  "hrms-sync": {
    title: "HRMS employee sync",
    description: "Pulls the employee master from Darwinbox, creates accounts for new joiners and assigns required courses.",
    cron: "0 2 * * *",
    schedule: "Daily at 02:00",
    run: () => syncEmployees(),
  },
  "send-nudges": {
    title: "Training nudges",
    description: "Sends Slack/email reminders to new joiners with pending training and to people whose certificate is expiring or expired.",
    cron: "30 10 * * *",
    schedule: "Daily at 10:30",
    run: ({ runId }) => dispatchNudges({ jobRunId: runId }),
  },
};

export const isJobName = (n: string): n is JobName => n in JOBS;

/**
 * Runs a job and records it in job_runs. A Postgres advisory lock per job makes
 * this safe whether it's triggered by the scheduler, an admin, or several app
 * replicas at once — a second concurrent run is skipped, not duplicated.
 */
export async function runJob(name: JobName, triggeredBy: string) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ locked: boolean }>("select pg_try_advisory_lock(hashtext($1)) as locked", [`job:${name}`]);
    if (!rows[0].locked) return { skipped: true as const, reason: "already running" };
    const [run] = await db.insert(jobRuns).values({ job: name, status: "running", triggeredBy }).returning();
    try {
      const summary = await JOBS[name].run({ runId: run.id });
      await db.update(jobRuns).set({ status: "succeeded", summary, finishedAt: new Date() }).where(eq(jobRuns.id, run.id));
      return { skipped: false as const, runId: run.id, summary };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      await db.update(jobRuns).set({ status: "failed", error, finishedAt: new Date() }).where(eq(jobRuns.id, run.id));
      throw e;
    } finally {
      await client.query("select pg_advisory_unlock(hashtext($1))", [`job:${name}`]);
    }
  } finally {
    client.release();
  }
}

export async function recentRuns(limit = 20) {
  return db.select().from(jobRuns).orderBy(desc(jobRuns.startedAt)).limit(limit);
}

export async function lastRunByJob() {
  const rows = await db.execute<{ job: string; status: string; started_at: Date; finished_at: Date | null; summary: unknown; error: string | null }>(sql`
    select distinct on (job) job, status, started_at, finished_at, summary, error
    from ${jobRuns} order by job, started_at desc`);
  return new Map(rows.rows.map((r) => [r.job, r]));
}
