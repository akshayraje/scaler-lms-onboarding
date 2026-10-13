import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

// Arbitrary constant; serialises migrations when several replicas boot at once.
const MIGRATION_LOCK_KEY = 72_210_431;

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => {});
    client.release();
  }
}
