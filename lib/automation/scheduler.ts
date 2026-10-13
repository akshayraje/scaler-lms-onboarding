import "server-only";
import { PgBoss } from "pg-boss";
import { JOBS, runJob, type JobName } from "./jobs";

// pg-boss keeps the schedule and job queue in Postgres (schema "pgboss"), so any
// number of app instances can run this: each cron tick produces one job, and
// the "stately" queue policy prevents pile-ups if a run is still going.

let boss: PgBoss | null = null;

export async function startScheduler() {
  if (boss) return boss;
  const tz = process.env.APP_TIMEZONE ?? "Asia/Kolkata";
  boss = new PgBoss({ connectionString: process.env.DATABASE_URL!, schema: "pgboss" });
  boss.on("error", (e) => console.error("[jobs]", e));
  await boss.start();

  for (const [name, job] of Object.entries(JOBS) as [JobName, (typeof JOBS)[JobName]][]) {
    await boss.createQueue(name, { policy: "stately", retryLimit: 2, retryDelay: 600, expireInSeconds: 3600 });
    await boss.schedule(name, job.cron, { triggeredBy: "schedule" }, { tz });
    await boss.work<{ triggeredBy: string }>(name, async ([j]) => {
      const res = await runJob(name, j.data.triggeredBy ?? "schedule");
      console.log(`[jobs] ${name}:`, res.skipped ? res.reason : res.summary);
    });
  }
  console.log(`[jobs] scheduler started (${Object.keys(JOBS).join(", ")}; tz ${tz})`);
  return boss;
}
