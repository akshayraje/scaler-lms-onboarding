import { and, eq, isNull } from "drizzle-orm";
import { COURSES, getCourse } from "@/content/courses";
import { DEFAULT_IN_PROGRESS, type CourseSettings } from "./course-settings";
import { db } from "./db";
import { courseSettings } from "./db/schema";

/** Used for a course with no code defaults: nothing automatic until an admin configures it. */
const EMPTY: CourseSettings = {
  coverage: { enabled: false, rules: [], dueInDays: 14 },
  nudges: { assignment: [], renewal: [], inProgress: DEFAULT_IN_PROGRESS },
  certificate: { validityMonths: null },
};

const defaultsFor = (courseId: string) => getCourse(courseId)?.defaults ?? EMPTY;

/** Rows saved before the in-progress nudge existed fall back to the course's code default for it. */
function withInProgress(n: Partial<CourseSettings["nudges"]>, courseId: string): CourseSettings["nudges"] {
  return {
    assignment: n.assignment ?? [],
    renewal: n.renewal ?? [],
    inProgress: { ...DEFAULT_IN_PROGRESS, ...defaultsFor(courseId).nudges.inProgress, ...(n.inProgress ?? {}) },
  };
}

function fromRow(r: typeof courseSettings.$inferSelect): CourseSettings {
  return {
    coverage: r.coverage as CourseSettings["coverage"],
    nudges: withInProgress(r.nudges as Partial<CourseSettings["nudges"]>, r.courseId),
    certificate: (r.certificate as CourseSettings["certificate"] | null) ?? defaultsFor(r.courseId).certificate,
  };
}

/** Create settings rows for courses that don't have one yet, from their code defaults. */
export async function seedCourseSettings() {
  for (const c of COURSES) {
    const d = c.defaults ?? EMPTY;
    await db
      .insert(courseSettings)
      .values({ courseId: c.slug, coverage: d.coverage, nudges: d.nudges, certificate: d.certificate })
      .onConflictDoNothing();
    // Rows created before the certificate setting existed: copy in the code default once.
    await db
      .update(courseSettings)
      .set({ certificate: d.certificate })
      .where(and(eq(courseSettings.courseId, c.slug), isNull(courseSettings.certificate)));
  }
}

export async function getCourseSettings(courseId: string): Promise<CourseSettings> {
  const [row] = await db.select().from(courseSettings).where(eq(courseSettings.courseId, courseId));
  return row ? fromRow(row) : defaultsFor(courseId);
}

export async function getAllCourseSettings(): Promise<Map<string, CourseSettings>> {
  const rows = await db.select().from(courseSettings);
  const byId = new Map(rows.map((r) => [r.courseId, fromRow(r)]));
  return new Map(COURSES.map((c) => [c.slug, byId.get(c.slug) ?? defaultsFor(c.slug)]));
}

export async function saveCourseSettings(courseId: string, s: CourseSettings, updatedBy: string) {
  await db
    .insert(courseSettings)
    .values({ courseId, coverage: s.coverage, nudges: s.nudges, certificate: s.certificate, updatedBy })
    .onConflictDoUpdate({
      target: courseSettings.courseId,
      set: { coverage: s.coverage, nudges: s.nudges, certificate: s.certificate, updatedBy, updatedAt: new Date() },
    });
}
