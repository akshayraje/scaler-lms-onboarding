import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------------ */
/* Auth.js tables (shapes required by @auth/drizzle-adapter). Extra columns  */
/* on `user` (role, last_login_at, timestamps) are ours.                     */
/* ------------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"),
  role: text("role", { enum: ["learner", "manager", "admin"] }).notNull().default("learner"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const account = pgTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] }), index("account_user_id_idx").on(t.userId)],
);

export const session = pgTable(
  "session",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

/* ------------------------------------------------------------------------ */
/* LMS                                                                      */
/* ------------------------------------------------------------------------ */

// Catalog row per course. Content lives in content/courses/<slug>; this row is
// upserted from that code on server start (see lib/db/bootstrap.ts) so reports
// can join against it.
export const courses = pgTable("courses", {
  id: text("id").primaryKey(), // == course slug
  title: text("title").notNull(),
  version: integer("version").notNull(),
  moduleCount: integer("module_count").notNull(),
  passThreshold: integer("pass_threshold").notNull(), // percent
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const enrollments = pgTable(
  "enrollments",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    status: text("status", { enum: ["not_started", "in_progress", "completed"] })
      .notNull()
      .default("not_started"),
    assignedBy: text("assigned_by"), // null = self-enrolled
    dueOn: date("due_on"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
);

export const moduleProgress = pgTable(
  "module_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    moduleId: text("module_id").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId, t.moduleId] })],
);

export const assessmentAttempts = pgTable(
  "assessment_attempts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    courseVersion: integer("course_version").notNull(),
    answers: jsonb("answers").$type<number[] | null>(),
    score: integer("score").notNull(), // percent
    correctCount: integer("correct_count").notNull(),
    total: integer("total").notNull(),
    passed: boolean("passed").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attempts_user_course_idx").on(t.userId, t.courseId, t.submittedAt)],
);

export const certificates = pgTable(
  "certificates",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    courseVersion: integer("course_version").notNull(),
    code: text("code").notNull().unique(),
    score: integer("score").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  // Not unique per user/course: annual renewals issue a new certificate each cycle.
  (t) => [index("certificates_user_course_idx").on(t.userId, t.courseId, t.issuedAt)],
);

/** Policy acknowledgements, with the exact statements agreed to (audit evidence). */
export const acknowledgements = pgTable(
  "acknowledgements",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    courseVersion: integer("course_version").notNull(),
    statements: jsonb("statements").$type<string[]>().notNull(),
    ip: text("ip"),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("acknowledgements_user_course_idx").on(t.userId, t.courseId, t.acknowledgedAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id"),
    email: text("email"),
    action: text("action").notNull(),
    courseId: text("course_id"),
    detail: text("detail"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_created_at_idx").on(t.createdAt)],
);

/* ------------------------------------------------------------------------ */
/* Automation: HRMS employee master, settings, job runs, notifications       */
/* ------------------------------------------------------------------------ */

/** Employee master synced from the HRMS (Darwinbox). Linked to `user` by email. */
export const employees = pgTable(
  "employees",
  {
    email: text("email").primaryKey(), // lower-cased company email
    employeeCode: text("employee_code"),
    name: text("name").notNull(),
    dateOfJoining: date("date_of_joining", { mode: "string" }),
    department: text("department"),
    designation: text("designation"),
    managerEmail: text("manager_email"),
    status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** Cached Slack member id (looked up by email). */
    slackUserId: text("slack_user_id"),
    raw: jsonb("raw"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("employees_doj_idx").on(t.dateOfJoining), index("employees_user_idx").on(t.userId)],
);

/** Admin-editable settings. Secret fields inside `value` are encrypted (see lib/settings.ts). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: updatedAt(),
});

/** One row per execution of a scheduled/manual job, for the admin UI. */
export const jobRuns = pgTable(
  "job_runs",
  {
    id: serial("id").primaryKey(),
    job: text("job").notNull(),
    status: text("status", { enum: ["running", "succeeded", "failed"] }).notNull(),
    triggeredBy: text("triggered_by").notNull(), // "schedule" or an admin email
    summary: jsonb("summary").$type<Record<string, unknown>>(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("job_runs_job_started_idx").on(t.job, t.startedAt)],
);

/**
 * Every nudge generated (sent, failed, or rendered in dry-run). `dedupeKey` makes a
 * given step of a given campaign go out at most once per person, per mode.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    userId: text("user_id"),
    courseId: text("course_id"),
    campaign: text("campaign", { enum: ["new_joiner", "renewal", "in_progress", "test"] }).notNull(),
    step: integer("step").notNull(),
    channel: text("channel", { enum: ["email", "slack"] }).notNull(),
    recipient: text("recipient").notNull(),
    cc: text("cc"),
    status: text("status", { enum: ["sent", "failed", "dry_run", "skipped"] }).notNull(),
    subject: text("subject"),
    body: text("body"),
    error: text("error"),
    jobRunId: integer("job_run_id"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_created_idx").on(t.createdAt)],
);

/** Admin-editable per-course settings (coverage rules, nudge schedule). Seeded from the course's code defaults. */
export const courseSettings = pgTable("course_settings", {
  courseId: text("course_id")
    .primaryKey()
    .references(() => courses.id, { onDelete: "cascade" }),
  coverage: jsonb("coverage").notNull(),
  nudges: jsonb("nudges").notNull(),
  /** { validityMonths: number | null }. Null column = not yet set (falls back to the course's code default). */
  certificate: jsonb("certificate"),
  updatedBy: text("updated_by"),
  updatedAt: updatedAt(),
});
