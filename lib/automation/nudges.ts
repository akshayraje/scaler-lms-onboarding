import "server-only";
import { and, desc, eq, inArray, isNotNull, like, sql } from "drizzle-orm";
import { getCourse } from "@/content/courses";
import { db } from "@/lib/db";
import { certificates, employees, enrollments, notifications, user } from "@/lib/db/schema";
import { getSettings, type NotificationMode } from "@/lib/settings";
import { getTemplates } from "@/lib/notifications/store";
import { dueStep } from "@/lib/course-settings";
import { courseUrl } from "@/lib/urls";
import { getAllCourseSettings } from "@/lib/course-settings-store";
import { notify, type NotifyTally } from "@/lib/notifications/notify";
import { availableProviders } from "@/lib/notifications/providers";
import type { FieldValues } from "@/lib/notifications/templates";

export type Campaign = "new_joiner" | "renewal" | "in_progress";

// Nudge schedules are per course (Admin → Courses), in days from an anchor:
//  - new_joiner: anchor = date the course was assigned by the HRMS sync
//  - renewal:    anchor = certificate expiry (negative = before expiry)
// Only the latest due step is ever sent, so a missed day or switching from
// dry-run to live never fires a backlog.
// Plus in_progress: a recurring nudge (once per run) for anyone with the course in
// progress, until completed or the course's max is reached — never on the same run
// as a scheduled step for the same person and course.

const DAY = 864e5;
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

async function inProgressCandidates(): Promise<(Candidate & { lastActivity: Date; dueOn: string | null })[]> {
  const rows = await db
    .select({
      userId: user.id,
      email: user.email,
      name: user.name,
      courseId: enrollments.courseId,
      startedAt: enrollments.startedAt,
      dueOn: enrollments.dueOn,
      lastProgress: sql<Date | null>`(select max(mp.completed_at) from module_progress mp
        where mp.user_id = ${enrollments.userId} and mp.course_id = ${enrollments.courseId})`,
      managerEmail: employees.managerEmail,
      employeeCode: employees.employeeCode,
      dateOfJoining: employees.dateOfJoining,
      department: employees.department,
      designation: employees.designation,
      employeeStatus: employees.status,
    })
    .from(enrollments)
    .innerJoin(user, eq(user.id, enrollments.userId))
    .leftJoin(employees, eq(employees.userId, user.id))
    .where(
      and(
        eq(enrollments.status, "in_progress"),
        sql`not exists (select 1 from ${certificates} c where c.user_id = ${user.id} and c.course_id = ${enrollments.courseId}
              and (c.expires_at is null or c.expires_at > now()))`,
      ),
    );
  return rows
    .filter((r) => r.employeeStatus !== "inactive" && r.startedAt)
    .map((r) => ({
      campaign: "in_progress" as const,
      userId: r.userId,
      email: r.email,
      name: r.name ?? r.email,
      courseId: r.courseId,
      cycle: r.startedAt!.toISOString().slice(0, 10),
      anchor: r.startedAt!,
      // Self-started enrollments without a due date fall back to start + "due in N days" (filled in later).
      date: r.dueOn ? new Date(r.dueOn) : r.startedAt!,
      dueOn: r.dueOn,
      lastActivity: r.lastProgress && new Date(r.lastProgress) > r.startedAt! ? new Date(r.lastProgress) : r.startedAt!,
      managerEmail: r.managerEmail,
      employee: { code: r.employeeCode, dateOfJoining: r.dateOfJoining, department: r.department, designation: r.designation },
    }));
}

/** Calendar date (YYYY-MM-DD) in the app timezone — one in-progress nudge per day. */
const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: process.env.APP_TIMEZONE ?? "Asia/Kolkata" });

/** Days already used by in-progress nudges, per course:user:cycle, in this mode. */
async function inProgressHistory(mode: NotificationMode) {
  const rows = await db
    .select({ key: notifications.dedupeKey })
    .from(notifications)
    .where(
      and(
        eq(notifications.campaign, "in_progress"),
        inArray(notifications.status, ["sent", "dry_run"]),
        like(notifications.dedupeKey, `${mode}:in_progress:%`),
      ),
    );
  const days = new Map<string, Set<string>>();
  for (const { key } of rows) {
    // ${mode}:in_progress:${course}:${user}:${cycle}:${day}:${provider}
    const [, , course, userId, cycle, day] = key.split(":");
    const k = `${course}:${userId}:${cycle}`;
    if (!days.has(k)) days.set(k, new Set());
    days.get(k)!.add(day);
  }
  return days;
}

/** user:course pairs that received a scheduled (new joiner / renewal) nudge today, in this mode. */
async function scheduledNudgesToday(mode: NotificationMode) {
  const tz = process.env.APP_TIMEZONE ?? "Asia/Kolkata";
  const rows = await db
    .selectDistinct({ userId: notifications.userId, courseId: notifications.courseId })
    .from(notifications)
    .where(
      and(
        inArray(notifications.campaign, ["new_joiner", "renewal"]),
        inArray(notifications.status, ["sent", "dry_run"]),
        like(notifications.dedupeKey, `${mode}:%`),
        sql`(${notifications.createdAt} at time zone ${tz})::date = (now() at time zone ${tz})::date`,
      ),
    );
  return rows.map((r) => `${r.userId}:${r.courseId}`);
}

export type DispatchSummary = NotifyTally & {
  mode: NotificationMode;
  candidates: number;
  due: number;
  /** In-progress nudges due this run (subset of `due`). */
  inProgressDue: number;
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
  const summary: DispatchSummary = { mode, candidates: 0, due: 0, inProgressDue: 0, sent: 0, dryRun: 0, failed: 0, alreadySent: 0, providers: providers.map((p) => p.id) };
  if (mode === "off") return summary;

  const candidates = [...(await newJoinerCandidates()), ...(await renewalCandidates())];
  summary.candidates = candidates.length;
  const templates = await getTemplates();
  const schedules = await getAllCourseSettings();

  // Person+course pairs that got a scheduled nudge today (no in-progress nudge on top).
  const nudgedThisRun = new Set<string>();

  for (const c of candidates) {
    const steps = schedules.get(c.courseId)?.nudges[c.campaign === "renewal" ? "renewal" : "assignment"] ?? [];
    const step = dueStep(steps, c.anchor);
    if (step < 0) continue;
    summary.due++;
    const course = getCourse(c.courseId);
    if (!course) continue;
    const url = courseUrl(course.slug);
    const escalate = steps[step].ccManager && !!c.managerEmail;
    const outcomes = await notify(
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
    if (outcomes.some((o) => o.status !== "already_sent")) nudgedThisRun.add(`${c.userId}:${c.courseId}`);
  }

  // Recurring nudge for anyone with a course in progress — but never on a day they
  // already got a scheduled nudge for that course (this run or an earlier run today).
  for (const k of await scheduledNudgesToday(mode)) nudgedThisRun.add(k);
  const inProgress = await inProgressCandidates();
  summary.candidates += inProgress.length;
  const history = await inProgressHistory(mode);
  const today = todayKey();
  for (const c of inProgress) {
    const cfg = schedules.get(c.courseId)?.nudges.inProgress;
    const course = getCourse(c.courseId);
    if (!cfg?.enabled || !course || nudgedThisRun.has(`${c.userId}:${c.courseId}`)) continue;
    const days = history.get(`${c.courseId}:${c.userId}:${c.cycle}`) ?? new Set<string>();
    if (days.size >= cfg.maxReminders && !days.has(today)) continue;
    if (cfg.inactiveDays > 0 && Math.floor((startOfDay(new Date()) - startOfDay(c.lastActivity)) / DAY) < cfg.inactiveDays) continue;
    summary.due++;
    summary.inProgressDue++;
    const dueInDays = schedules.get(c.courseId)!.coverage.dueInDays;
    const due = c.dueOn ? c : { ...c, date: new Date(c.anchor.getTime() + dueInDays * DAY) };
    const url = courseUrl(course.slug);
    await notify(
      {
        // One per day; the step is the reminder's number in this enrollment's cycle.
        dedupeKey: [c.campaign, c.courseId, c.userId, c.cycle, today].join(":"),
        to: c.email,
        template: templates.reminder.template,
        values: fieldValues(due, course.title, url),
        url,
        meta: { userId: c.userId, courseId: c.courseId, campaign: "in_progress", step: days.has(today) ? days.size - 1 : days.size, jobRunId: opts.jobRunId },
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
  if (c.campaign === "new_joiner" || c.campaign === "in_progress") {
    base.due_date = fmtDate(c.date);
    base.due_status = d > 0 ? `due in ${plural(d, "day")}` : d === 0 ? "due today" : `overdue by ${plural(-d, "day")}`;
  } else {
    base.expiry_date = fmtDate(c.date);
    base.expiry_status = d > 0 ? `expires in ${plural(d, "day")}` : d === 0 ? "expires today" : `expired ${plural(-d, "day")} ago`;
  }
  return base;
}
