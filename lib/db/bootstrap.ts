import { sql } from "drizzle-orm";
import { COURSES } from "@/content/courses";
import { seedCourseSettings } from "@/lib/course-settings-store";
import { db } from "./index";
import { courses } from "./schema";

/** Upsert the catalog rows for every course defined in code, then seed missing per-course settings. */
export async function syncCourseCatalog() {
  for (const c of COURSES) {
    await db
      .insert(courses)
      .values({
        id: c.slug,
        title: c.title,
        version: c.version,
        moduleCount: c.modules.length,
        passThreshold: Math.round(c.passThreshold * 100),
      })
      .onConflictDoUpdate({
        target: courses.id,
        set: {
          title: sql`excluded.title`,
          version: sql`excluded.version`,
          moduleCount: sql`excluded.module_count`,
          passThreshold: sql`excluded.pass_threshold`,
        },
      });
  }
  await seedCourseSettings();
}
