import "server-only";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getCourse } from "@/content/courses";
import { db } from "@/lib/db";
import { certificates, employees, enrollments, user } from "@/lib/db/schema";
import { getSettings, type NotificationMode } from "@/lib/settings";
import { getTemplates } from "@/lib/notifications/store";
import { dueStep } from "@/lib/course-settings";
import { getAllCourseSettings } from "@/lib/course-settings-store";
import { notify, type NotifyTally } from "@/lib/notifications/notify";
import { availableProviders } from "@/lib/notifications/providers";
import type { FieldValues } from "@/lib/notifications/templates";

export type Campaign = "new_joiner" | "renewal";

// Nudge schedules are per course (Admin → Courses), in days from an anchor:
//  - new_joiner: anchor = date the course was assigned by the HRMS sync
//  - renewal:    anchor = certificate expiry (negative = before expiry)
// Only the latest due step is ever sent, so a missed day or switching from
// dry-run to live never fires a backlog.

const DAY = 864e5;
const appUrl = () => (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

type Candidate = {
  campaign: Campaign;
  userId: string;
  email: string;
  name: string;
  courseId: string;
  /** Identifies the cycle (assignment or certificate) so a new cycle restarts the schedule. */
  cycle: string;
  anchor: Date;
  /** Due date (new_joiner) or expiry (renewal), shown in the message. */
  date: Date;
  managerEmail: string | null;
  /** HRMS fields available to templates. */
  employee: { code: string | null; dateOfJoining: string | null; department: string | null; designation: string | null };
};

async function newJoinerCandidates(): Promise<Candidate[]> {
  const rows = await db
    .select({
      userId: user.id,
      email: user.email,
      name: user.name,
      courseId: enrollments.courseId,
      assignedAt: enrollments.createdAt,
      dueOn: enrollments.dueOn,
      managerEmail: employees.managerEmail,
      employeeCode: employees.employeeCode,
      dateOfJoining: employees.dateOfJoining,
      department: employees.department,
      designation: employees.designation,
    })
    .from(enrollments)
    .innerJoin(user, eq(user.id, enrollments.userId))
    .innerJoin(employees, and(eq(employees.userId, user.id), eq(employees.status, "active")))
    .where(
      and(
        eq(enrollments.assignedBy, "hrms"),
        sql`${enrollments.status} <> 'completed'`,
        // No currently valid certificate for this course.
        sql`not exists (select 1 from ${certificates} c where c.user_id = ${user.id} and c.course_id = ${enrollments.courseId}
              and (c.expires_at is null or c.expires_at > now()))`,
      ),
    );
  return rows.map((r) => ({
    campaign: "new_joiner",
    userId: r.userId,
    email: r.email,
    name: r.name ?? r.email,
    courseId: r.courseId,
    cycle: r.assignedAt.toISOString().slice(0, 10),
    anchor: r.assignedAt,
    date: r.dueOn ? new Date(r.dueOn) : r.assignedAt,
    managerEmail: r.managerEmail,
    employee: { code: r.employeeCode, dateOfJoining: r.dateOfJoining, department: r.department, designation: r.designation },
  }));
}

async function renewalCandidates(): Promise<Candidate[]> {
  // Latest certificate per user+course that expires within a week (or already has).
  const latest = await db
    .selectDistinctOn([certificates.userId, certificates.courseId], {
      userId: certificates.userId,
      courseId: certificates.courseId,
      code: certificates.code,
      expiresAt: certificates.expiresAt,
      email: user.email,
      name: user.name,
      managerEmail: employees.managerEmail,
      employeeCode: employees.employeeCode,
      dateOfJoining: employees.dateOfJoining,
      department: employees.department,
      designation: employees.designation,
      employeeStatus: employees.status,
    })
    .from(certificates)
    .innerJoin(user, eq(user.id, certificates.userId))
    .leftJoin(employees, eq(employees.userId, user.id))
    .where(isNotNull(certificates.expiresAt))
    .orderBy(certificates.userId, certificates.courseId, desc(certificates.issuedAt));

  // Renewal steps can start up to 60 days before expiry (see course-settings validation).
  const horizon = Date.now() + 60 * DAY;
  return latest
    .filter((r) => r.expiresAt!.getTime() <= horizon && r.employeeStatus !== "inactive")
    .map((r) => ({
      campaign: "renewal",
      userId: r.userId,
      email: r.email,
      name: r.name ?? r.email,
      courseId: r.courseId,
      cycle: r.code,
      anchor: r.expiresAt!,
      date: r.expiresAt!,
      managerEmail: r.managerEmail,
        employee: { code: r.employeeCode, dateOfJoining: r.dateOfJoining, department: r.department, designation: r.designation },
    }));
}

export type DispatchSummary = NotifyTally & {
  mode: NotificationMode;
  candidates: number;
  due: number;
  providers: string[];
};

/**
 * Works out who is due which nudge, and hands each one to the unified
 * notification pipeline (lib/notifications/notify.ts), which delivers it via
 * every available provider. At escalation steps the manager is CC'd —
 * providers without CC support (Slack) deliver to the learner only.
 */
export async function dispatchNudges(opts: { jobRunId?: number } = {}): Promise<DispatchSummary> {
  const { mode } = await getSettings("notifications");
  const providers = availableProviders();
  const summary: DispatchSummary = { mode, candidates: 0, due: 0, sent: 0, dryRun: 0, failed: 0, alreadySent: 0, providers: providers.map((p) => p.id) };
  if (mode === "off") return summary;

  const candidates = [...(await newJoinerCandidates()), ...(await renewalCandidates())];
  summary.candidates = candidates.length;
  const templates = await getTemplates();
  const schedules = await getAllCourseSettings();

  for (const c of candidates) {
    const steps = schedules.get(c.courseId)?.nudges[c.campaign === "renewal" ? "renewal" : "assignment"] ?? [];
    const step = dueStep(steps, c.anchor);
    if (step < 0) continue;
    summary.due++;
    const course = getCourse(c.courseId);
    if (!course) continue;
    // Deep link: lands on the course, or goes through Google sign-in and back.
    const url = `${appUrl()}/courses/${course.slug}`;
    const escalate = steps[step].ccManager && !!c.managerEmail;
    await notify(
      {
        dedupeKey: [c.campaign, c.courseId, c.userId, c.cycle, step].join(":"),
        to: c.email,
        cc: escalate ? [c.managerEmail!] : [],
        template: templates[c.campaign === "renewal" ? "renewal" : step === 0 ? "course_assigned" : "reminder"].template,
        values: fieldValues(c, course.title, url),
        url,
        meta: { userId: c.userId, courseId: c.courseId, campaign: c.campaign, step, jobRunId: opts.jobRunId },
      },
      mode,
      summary,
      providers,
    );
  }
  return summary;
}

const TZ = process.env.APP_TIMEZONE ?? "Asia/Kolkata";
const fmtDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }) : "";
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const daysUntil = (d: Date) => Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);

/** Values for template fields. Exported for tests. */
export function fieldValues(c: Candidate, courseTitle: string, url: string): FieldValues {
  const d = daysUntil(c.date);
  const base: FieldValues = {
    full_name: c.name,
    email: c.email,
    employee_id: c.employee.code ?? "",
    date_of_joining: fmtDate(c.employee.dateOfJoining),
    department: c.employee.department ?? "",
    designation: c.employee.designation ?? "",
    manager_email: c.managerEmail ?? "",
    course_title: courseTitle,
    course_link: url,
  };
  if (c.campaign === "new_joiner") {
    base.due_date = fmtDate(c.date);
    base.due_status = d > 0 ? `due in ${plural(d, "day")}` : d === 0 ? "due today" : `overdue by ${plural(-d, "day")}`;
  } else {
    base.expiry_date = fmtDate(c.date);
    base.expiry_status = d > 0 ? `expires in ${plural(d, "day")}` : d === 0 ? "expires today" : `expired ${plural(-d, "day")} ago`;
  }
  return base;
}
