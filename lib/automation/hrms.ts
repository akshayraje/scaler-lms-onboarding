import "server-only";
import crypto from "node:crypto";
import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import { COURSES } from "@/content/courses";
import { getCertificationStatus } from "@/lib/certification";
import { db } from "@/lib/db";
import { employees, enrollments, user } from "@/lib/db/schema";
import { isAllowedEmail } from "@/lib/domain";
import { HRMS_FIELDS, type HrmsFieldKey } from "@/lib/hrms-fields";
import { getAllCourseSettings } from "@/lib/course-settings-store";
import { matchesCoverage } from "@/lib/course-settings";
import { hrmsConnection, type HrmsConnection } from "./config";

export type HrmsEmployee = {
  email: string;
  name: string;
  employeeCode: string | null;
  dateOfJoining: string | null; // YYYY-MM-DD
  managerEmail: string | null;
  department: string | null;
  designation: string | null;
  raw: unknown;
};

/* ------------------------------- providers ------------------------------ */

/** Darwinbox field name per employee attribute (see lib/hrms-fields.ts). */
const DARWINBOX_FIELDS = Object.fromEntries(HRMS_FIELDS.map((f) => [f.key, f.darwinbox])) as Record<HrmsFieldKey, string>;

/**
 * Darwinbox Employee Master API: POST {baseUrl}/masterapi/employee with basic auth
 * and { api_key, datasetKey } in the body. Field names come from HRMS_FIELDS (lib/hrms-fields.ts).
 */
async function fetchDarwinbox(s: Extract<HrmsConnection, { provider: "darwinbox" }>): Promise<HrmsEmployee[]> {
  const f = DARWINBOX_FIELDS;
  if (!s.baseUrl || !s.apiKey || !s.datasetKey) throw new Error("Darwinbox base URL, API key and dataset key are required");
  const res = await fetch(`${s.baseUrl.replace(/\/$/, "")}/masterapi/employee`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(s.username ? { Authorization: "Basic " + Buffer.from(`${s.username}:${s.password}`).toString("base64") } : {}),
    },
    body: JSON.stringify({ api_key: s.apiKey, datasetKey: s.datasetKey }),
  });
  if (!res.ok) throw new Error(`Darwinbox: HTTP ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
  const json = (await res.json()) as Record<string, unknown>;
  if (json.status === 0 || json.status === "0") throw new Error(`Darwinbox: ${String(json.message ?? "request failed")}`);
  const rows = (json.employee_data ?? json.data ?? []) as Record<string, unknown>[];
  if (!Array.isArray(rows)) throw new Error("Darwinbox: unexpected response shape (no employee_data array)");
  const str = (r: Record<string, unknown>, k: string) => {
    const v = r[k];
    return typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null;
  };
  return rows
    .map((r) => ({
      email: (str(r, f.email) ?? "").toLowerCase(),
      name: str(r, f.name) ?? "",
      employeeCode: str(r, f.employeeCode),
      dateOfJoining: parseDate(str(r, f.dateOfJoining)),
      managerEmail: str(r, f.managerEmail)?.toLowerCase() ?? null,
      department: str(r, f.department),
      designation: str(r, f.designation),
      raw: r,
    }))
    .filter((e) => e.email);
}

/** Sample data for local testing: a few recent joiners on the company domain. */
function fetchMock(): HrmsEmployee[] {
  const domain = process.env.COMPANY_DOMAIN ?? "example.com";
  const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const mk = (name: string, doj: string, manager: string | null, dept: string): HrmsEmployee => {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@${domain}`;
    return { email, name, employeeCode: `MOCK-${name.split(" ")[0].toUpperCase()}`, dateOfJoining: doj, managerEmail: manager, department: dept, designation: "Associate", raw: { mock: true } };
  };
  const lead = `riya.lead@${domain}`;
  return [
    mk("Riya Lead", daysAgo(900), null, "Academics"),
    mk("Kabir Newjoiner", daysAgo(1), lead, "Academics"),
    mk("Ananya Recent", daysAgo(6), lead, "Academics"),
    mk("Dev Overdue", daysAgo(20), lead, "Sales"),
    mk("Old Timer", daysAgo(400), lead, "Sales"),
  ];
}

export async function fetchHrmsEmployees(conn: HrmsConnection = hrmsConnection()): Promise<HrmsEmployee[]> {
  if (conn.provider === "darwinbox") return fetchDarwinbox(conn);
  if (conn.provider === "mock") return fetchMock();
  throw new Error("No HRMS configured — set DARWINBOX_* (or HRMS_PROVIDER=mock) on the server");
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Accepts YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD-Mon-YYYY. Returns YYYY-MM-DD or null. */
export function parseDate(v: string | null): string | null {
  if (!v) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(v);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = /^(\d{1,2})[-\s]([A-Za-z]{3})[A-Za-z]*[-\s,]+(\d{4})$/.exec(v);
  if (m) {
    const mon = MONTHS.indexOf(m[2].toLowerCase());
    if (mon >= 0) return `${m[3]}-${String(mon + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

/* --------------------------------- sync --------------------------------- */

export type SyncSummary = {
  fetched: number;
  skippedOtherDomain: number;
  upserted: number;
  deactivated: number;
  accountsCreated: number;
  assignments: number;
  /** Employees matched by each course's coverage rules. */
  covered: Record<string, number>;
};

export async function syncEmployees(): Promise<SyncSummary> {
  const all = await fetchHrmsEmployees();
  const fetched = all.filter((e) => isAllowedEmail(e.email));
  const summary: SyncSummary = {
    fetched: all.length,
    skippedOtherDomain: all.length - fetched.length,
    upserted: 0,
    deactivated: 0,
    accountsCreated: 0,
    assignments: 0,
    covered: {},
  };

  for (const e of fetched) {
    await db
      .insert(employees)
      .values({ ...e, status: "active", syncedAt: new Date() })
      .onConflictDoUpdate({
        target: employees.email,
        set: {
          name: e.name || sql`${employees.name}`,
          employeeCode: e.employeeCode,
          dateOfJoining: e.dateOfJoining,
          managerEmail: e.managerEmail,
          department: e.department,
          designation: e.designation,
          status: "active",
          raw: e.raw,
          syncedAt: new Date(),
        },
      });
    summary.upserted++;
  }

  // People no longer in the active dataset have left. Only trust a non-empty fetch.
  if (fetched.length) {
    const gone = await db
      .update(employees)
      .set({ status: "inactive" })
      .where(and(eq(employees.status, "active"), notInArray(employees.email, fetched.map((e) => e.email))))
      .returning({ email: employees.email });
    summary.deactivated = gone.length;
  }

  // Assign courses per their coverage rules (Admin → Courses).
  const active = await db.select().from(employees).where(eq(employees.status, "active"));
  const allSettings = await getAllCourseSettings();
  for (const course of COURSES) {
    const { coverage } = allSettings.get(course.slug)!;
    if (!coverage.enabled || !coverage.rules.length) continue;
    const covered = active.filter((e) => matchesCoverage(coverage.rules, e)); // all rules must match
    summary.covered[course.slug] = covered.length;

    for (const e of covered) {
      const userId = e.userId ?? (await ensureUser(e.email, e.name, summary));
      if (!e.userId) {
        await db.update(employees).set({ userId }).where(eq(employees.email, e.email));
        e.userId = userId; // reused by later courses in this run
      }
      if ((await getCertificationStatus(userId, course.slug)).valid) continue;
      const dueOn = new Date(Date.now() + coverage.dueInDays * 864e5).toISOString().slice(0, 10);
      const inserted = await db
        .insert(enrollments)
        .values({ userId, courseId: course.slug, status: "not_started", assignedBy: "hrms", dueOn })
        .onConflictDoNothing()
        .returning();
      if (inserted.length) summary.assignments++;
      else {
        // Already self-enrolled: mark it as an HRMS assignment so nudges apply.
        await db
          .update(enrollments)
          .set({ assignedBy: "hrms", dueOn })
          .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, course.slug), isNull(enrollments.assignedBy)));
      }
    }
  }
  return summary;
}

/** Pre-create the account so assignments exist before first login (Google links on sign-in). */
async function ensureUser(email: string, name: string, summary: SyncSummary): Promise<string> {
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, email, name: name || email });
  summary.accountsCreated++;
  return id;
}
