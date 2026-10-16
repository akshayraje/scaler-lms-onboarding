import { describe, expect, it } from "vitest";
import { COURSES } from "@/content/courses";
import { describeStep, dueStep, validateCourseSettings } from "./course-settings";

const day = (base: Date, n: number) => new Date(base.getTime() + n * 864e5);
const steps = [
  { day: 0, ccManager: false },
  { day: 4, ccManager: false },
  { day: 14, ccManager: true },
];

describe("dueStep", () => {
  const anchor = new Date(2026, 0, 10, 15, 0);
  it("picks the latest step that has arrived", () => {
    expect(dueStep(steps, anchor, day(anchor, 0))).toBe(0);
    expect(dueStep(steps, anchor, day(anchor, 3))).toBe(0);
    expect(dueStep(steps, anchor, day(anchor, 4))).toBe(1);
    expect(dueStep(steps, anchor, day(anchor, 60))).toBe(2);
  });
  it("supports steps before the anchor (renewal)", () => {
    const renewal = [{ day: -7, ccManager: false }, { day: 0, ccManager: false }];
    expect(dueStep(renewal, anchor, day(anchor, -8))).toBe(-1);
    expect(dueStep(renewal, anchor, day(anchor, -7))).toBe(0);
  });
  it("returns -1 for an empty schedule", () => expect(dueStep([], anchor)).toBe(-1));
});

describe("validateCourseSettings", () => {
  const ok = {
    coverage: { enabled: true, rules: [{ id: "a", type: "joined_within", days: 30 }], dueInDays: 14 },
    nudges: { assignment: [{ day: 9, ccManager: true }, { day: 0, ccManager: false }], renewal: [{ day: -7, ccManager: false }] },
  };
  it("accepts and sorts steps", () => {
    const r = validateCourseSettings(ok);
    expect(r.errors).toEqual([]);
    expect(r.value!.nudges.assignment.map((s) => s.day)).toEqual([0, 9]);
  });
  it("rejects bad input", () => {
    expect(validateCourseSettings({ ...ok, coverage: { ...ok.coverage, dueInDays: 0 } }).errors[0]).toMatch(/Due in days/);
    expect(validateCourseSettings({ ...ok, nudges: { ...ok.nudges, assignment: [{ day: 3 }, { day: 3 }] } }).errors[0]).toMatch(/same day/);
    expect(validateCourseSettings({ ...ok, nudges: { ...ok.nudges, assignment: [{ day: -1 }] } }).errors[0]).toMatch(/between 0/);
    expect(validateCourseSettings({ ...ok, coverage: { ...ok.coverage, rules: [] } }).errors[0]).toMatch(/at least one coverage rule/);
    expect(validateCourseSettings({ ...ok, coverage: { ...ok.coverage, rules: [{ type: "nope" }] } }).errors[0]).toMatch(/unknown rule/);
  });
  it("validates department/designation rules and one rule per kind", () => {
    const dept = { id: "d", type: "employee_field", field: "department", values: ["Academics", " academics ", "Sales"] };
    const r = validateCourseSettings({ ...ok, coverage: { ...ok.coverage, rules: [...ok.coverage.rules, dept] } });
    expect(r.errors).toEqual([]);
    expect(r.value!.coverage.rules[1]).toMatchObject({ field: "department", values: ["Academics", "Sales"] });
    expect(validateCourseSettings({ ...ok, coverage: { ...ok.coverage, rules: [{ ...dept, values: [] }] } }).errors[0]).toMatch(/at least one department/);
    expect(validateCourseSettings({ ...ok, coverage: { ...ok.coverage, rules: [dept, { ...dept, id: "e" }] } }).errors[0]).toMatch(/one rule per kind/);
    expect(validateCourseSettings({ ...ok, coverage: { ...ok.coverage, rules: [{ ...dept, field: "salary" }] } }).errors[0]).toMatch(/unknown employee field/);
  });
  it("validates certificate validity", () => {
    expect(validateCourseSettings({ ...ok, certificate: { validityMonths: null } }).value!.certificate.validityMonths).toBeNull();
    expect(validateCourseSettings({ ...ok, certificate: { validityMonths: 24 } }).value!.certificate.validityMonths).toBe(24);
    expect(validateCourseSettings({ ...ok, certificate: { validityMonths: 0 } }).errors[0]).toMatch(/validity/);
  });
  it("validates the in-progress nudge, defaulting it when missing", () => {
    expect(validateCourseSettings(ok).value!.nudges.inProgress).toEqual({ enabled: false, maxReminders: 5, inactiveDays: 1 });
    const on = { ...ok, nudges: { ...ok.nudges, inProgress: { enabled: true, maxReminders: 3, inactiveDays: 0 } } };
    expect(validateCourseSettings(on).value!.nudges.inProgress).toEqual({ enabled: true, maxReminders: 3, inactiveDays: 0 });
    expect(validateCourseSettings({ ...on, nudges: { ...on.nudges, inProgress: { enabled: true, maxReminders: 0, inactiveDays: 0 } } }).errors[0]).toMatch(/max must be/);
    expect(validateCourseSettings({ ...on, nudges: { ...on.nudges, inProgress: { enabled: true, maxReminders: 3, inactiveDays: -1 } } }).errors[0]).toMatch(/without progress/);
  });
  it("course code defaults are valid", () => {
    for (const c of COURSES) if (c.defaults) expect(validateCourseSettings(c.defaults).errors).toEqual([]);
  });
});

describe("describeStep", () => {
  it("reads naturally", () => {
    expect(describeStep({ day: 0, ccManager: false }, "assignment")).toBe("On assignment");
    expect(describeStep({ day: 14, ccManager: true }, "assignment")).toBe("Day 14 + manager");
    expect(describeStep({ day: -7, ccManager: false }, "renewal")).toBe("7 days before expiry");
  });
});
