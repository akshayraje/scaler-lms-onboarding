import { runMigrations } from "../lib/db/migrate";
import { syncCourseCatalog } from "../lib/db/bootstrap";
import { pool } from "../lib/db";

runMigrations()
  .then(syncCourseCatalog)
  .then(() => console.log("Migrations applied, course catalog synced."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
