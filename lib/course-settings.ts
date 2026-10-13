// Per-course admin settings: who gets the course (coverage) and when they're
// nudged (schedule). Pure module — shared by the server and the admin UI.

/* ------------------------------- coverage ------------------------------- */

/**
 * A coverage rule selects employees from the HRMS employee master. A course is
 * assigned to employees matching ALL of its rules (AND).
 *  - joined_within:  joined in the last N days (not future joiners)
 *  - employee_field: an employee-master field is any of the given values (OR within the rule, case-insensitive)
 * Each kind of rule can appear at most once per course.
 */
export type CoverageRule =
  | { id: string; type: "joined_within"; days: number }
  | { id: string; type: "employee_field"; field: EmployeeFilterField; values: string[] };

/** Employee-master fields that coverage rules can filter on. */
export const FILTER_FIELDS = [
  { field: "department", label: "Department" },
  { field: "designation", label: "Designation" },
] as const;
export type EmployeeFilterField = (typeof FILTER_FIELDS)[number]["field"];

export type CourseCoverage = {
  /** Assign automatically during the HRMS sync. */
  enabled: boolean;
  rules: CoverageRule[];
  /** Due date = assignment date + this many days. */
  dueInDays: number;
};

export function describeRule(r: CoverageRule) {
  if (r.type === "joined_within") return `Joined in the last ${r.days} day${r.days === 1 ? "" : "s"}`;
  const label = FILTER_FIELDS.find((f) => f.field === r.field)?.label ?? r.field;
  return `${label} is ${r.values.length === 1 ? r.values[0] : `any of ${r.values.join(", ")}`}`;
}

/** Whether an employee matches every rule. Exported for the sync and tests. */
export function matchesCoverage(
  rules: CoverageRule[],
  e: { dateOfJoining: string | null; department: string | null; designation: string | null },
  today = new Date(),
) {
  return rules.length > 0 && rules.every((r) => matchesRule(r, e, today));
}

export function matchesRule(
  r: CoverageRule,
  e: { dateOfJoining: string | null; department?: string | null; designation?: string | null },
  today = new Date(),
) {
  switch (r.type) {
    case "joined_within": {
      if (!e.dateOfJoining) return false;
      const since = new Date(today.getTime() - r.days * 864e5).toISOString().slice(0, 10);
      return e.dateOfJoining >= since && e.dateOfJoining <= today.toISOString().slice(0, 10);
    }
    case "employee_field": {
      const v = e[r.field]?.trim().toLowerCase();
      return !!v && r.values.some((x) => x.trim().toLowerCase() === v);
    }
  }
}

/* ------------------------------- schedule ------------------------------- */

/** A nudge step: `day` is relative to the anchor; `ccManager` copies the manager (where the provider supports CC). */
export type NudgeStep = { day: number; ccManager: boolean };

export type NudgeSchedule = {
  /** Days after assignment. The first step uses the "Course assigned" template, later ones "Reminder". */
  assignment: NudgeStep[];
  /** Days relative to certificate expiry (negative = before). Only used if certificates expire. */
  renewal: NudgeStep[];
};

/** Certificate validity in months; null = never expires. Applies to certificates issued from now on. */
export type CertificateSettings = { validityMonths: number | null };

export type CourseSettings = { coverage: CourseCoverage; nudges: NudgeSchedule; certificate: CertificateSettings };

export const MAX_STEPS = 10;

/* ------------------------------ validation ------------------------------ */

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : NaN);

function validateSteps(steps: unknown, label: string, minDay: number, errors: string[]): NudgeStep[] {
  if (!Array.isArray(steps)) {
    errors.push(`${label}: invalid steps`);
    return [];
  }
  if (steps.length > MAX_STEPS) errors.push(`${label}: at most ${MAX_STEPS} steps`);
  const out = steps.map((s: { day?: unknown; ccManager?: unknown }) => ({ day: int(s?.day), ccManager: s?.ccManager === true }));
  out.forEach((s, i) => {
    if (Number.isNaN(s.day)) errors.push(`${label} step ${i + 1}: day must be a whole number`);
    else if (s.day < minDay || s.day > 365) errors.push(`${label} step ${i + 1}: day must be between ${minDay} and 365`);
  });
  const days = out.map((s) => s.day);
  if (new Set(days).size !== days.length) errors.push(`${label}: two steps can't be on the same day`);
  return [...out].sort((a, b) => a.day - b.day);
}

/** Validates and normalises settings from the admin UI. Returns errors instead of throwing. */
export function validateCourseSettings(input: unknown): { value?: CourseSettings; errors: string[] } {
  const errors: string[] = [];
  const i = (input ?? {}) as { coverage?: Partial<CourseCoverage>; nudges?: Partial<NudgeSchedule>; certificate?: Partial<CertificateSettings> };
  const cov = i.coverage ?? {};
  const dueInDays = int(cov.dueInDays);
  if (Number.isNaN(dueInDays) || dueInDays < 1 || dueInDays > 365) errors.push("Due in days must be between 1 and 365");

  const rules: CoverageRule[] = [];
  for (const [n, raw] of (Array.isArray(cov.rules) ? cov.rules : []).entries()) {
    const r = raw as Record<string, unknown>;
    const id = typeof r?.id === "string" && r.id ? r.id : `r${n + 1}`;
    if (r?.type === "joined_within") {
      const days = int(r.days);
      if (Number.isNaN(days) || days < 1 || days > 365) errors.push(`Rule ${n + 1}: days must be between 1 and 365`);
      rules.push({ id, type: "joined_within", days });
    } else if (r?.type === "employee_field") {
      const field = FILTER_FIELDS.find((f) => f.field === r.field)?.field;
      // Trim and de-duplicate case-insensitively (matching ignores case), keeping the first spelling.
      const seen = new Set<string>();
      const values = (Array.isArray(r.values) ? r.values : [])
        .map((v) => String(v).trim())
        .filter((v) => v && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()));
      if (!field) errors.push(`Rule ${n + 1}: unknown employee field`);
      else if (!values.length) errors.push(`Rule ${n + 1}: add at least one ${field} value`);
      else rules.push({ id, type: "employee_field", field, values });
    } else errors.push(`Rule ${n + 1}: unknown rule type`);
  }
  const kinds = rules.map((r) => (r.type === "employee_field" ? r.field : r.type));
  if (new Set(kinds).size !== kinds.length) errors.push("Use one rule per kind — list several values inside a single rule instead");
  if (cov.enabled && !rules.length) errors.push("Add at least one coverage rule, or turn automatic assignment off");

  const n = i.nudges ?? {};
  const assignment = validateSteps(n.assignment, "After assignment", 0, errors);
  const renewal = validateSteps(n.renewal, "Around expiry", -60, errors);
  if (cov.enabled && !assignment.length) errors.push("Add at least one nudge step after assignment");

  const vm = i.certificate?.validityMonths;
  const validityMonths = vm === null || vm === undefined ? null : int(vm);
  if (validityMonths !== null && (Number.isNaN(validityMonths) || validityMonths < 1 || validityMonths > 120))
    errors.push("Certificate validity must be between 1 and 120 months");

  if (errors.length) return { errors };
  return {
    value: { coverage: { enabled: !!cov.enabled, rules, dueInDays }, nudges: { assignment, renewal }, certificate: { validityMonths } },
    errors,
  };
}

/* -------------------------------- helpers ------------------------------- */

/** Index of the latest step whose day has arrived, or -1. */
export function dueStep(steps: NudgeStep[], anchor: Date, now = new Date()) {
  const day = 864e5;
  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const elapsed = Math.floor((startOfDay(now) - startOfDay(anchor)) / day);
  let step = -1;
  steps.forEach((s, i) => {
    if (elapsed >= s.day) step = i;
  });
  return step;
}

export function describeStep(s: NudgeStep, kind: "assignment" | "renewal") {
  const when =
    kind === "assignment"
      ? s.day === 0
        ? "On assignment"
        : `Day ${s.day}`
      : s.day < 0
        ? `${-s.day} day${s.day === -1 ? "" : "s"} before expiry`
        : s.day === 0
          ? "On expiry"
          : `${s.day} day${s.day === 1 ? "" : "s"} after expiry`;
  return s.ccManager ? `${when} + manager` : when;
}
