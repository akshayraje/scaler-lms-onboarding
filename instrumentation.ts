// Runs once per server process before requests are served: apply pending DB
// migrations and upsert the course catalog. Safe with multiple replicas
// (migrations take a Postgres advisory lock).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.SKIP_DB_BOOTSTRAP === "1") return;
  const { runMigrations } = await import("./lib/db/migrate");
  const { syncCourseCatalog } = await import("./lib/db/bootstrap");
  await runMigrations();
  await syncCourseCatalog();

  // Background jobs (HRMS sync, nudges). Set JOBS_RUNNER=off on instances that shouldn't run them.
  if (process.env.JOBS_RUNNER !== "off") {
    const { startScheduler } = await import("./lib/automation/scheduler");
    await startScheduler().catch((e) => console.error("[jobs] failed to start scheduler", e));
  }
}
