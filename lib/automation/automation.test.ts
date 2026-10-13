import { describe, expect, it } from "vitest";
import { matchesCoverage, matchesRule } from "@/lib/course-settings";
import { parseDate } from "./hrms";


describe("matchesRule (coverage)", () => {
  const today = new Date("2026-10-13T10:00:00Z");
  const rule = { id: "r", type: "joined_within" as const, days: 30 };
  it("matches people who joined within the window, not future joiners", () => {
    expect(matchesRule(rule, { dateOfJoining: "2026-10-01" }, today)).toBe(true);
    expect(matchesRule(rule, { dateOfJoining: "2026-09-13" }, today)).toBe(true);
    expect(matchesRule(rule, { dateOfJoining: "2026-09-12" }, today)).toBe(false);
    expect(matchesRule(rule, { dateOfJoining: "2026-10-20" }, today)).toBe(false);
    expect(matchesRule(rule, { dateOfJoining: null }, today)).toBe(false);
  });
  it("matches department/designation case-insensitively", () => {
    const dept = { id: "d", type: "employee_field" as const, field: "department" as const, values: ["Academics", "Sales"] };
    const e = { dateOfJoining: "2026-10-01", department: "academics ", designation: "TA" };
    expect(matchesRule(dept, e, today)).toBe(true);
    expect(matchesRule(dept, { ...e, department: "Engineering" }, today)).toBe(false);
    expect(matchesRule(dept, { ...e, department: null }, today)).toBe(false);
  });
  it("applies AND across rules", () => {
    const dept = { id: "d", type: "employee_field" as const, field: "department" as const, values: ["Academics"] };
    const desig = { id: "g", type: "employee_field" as const, field: "designation" as const, values: ["Teaching Assistant"] };
    const e = { dateOfJoining: "2026-10-01", department: "Academics", designation: "Teaching Assistant" };
    expect(matchesCoverage([rule, dept, desig], e, today)).toBe(true);
    expect(matchesCoverage([rule, dept, desig], { ...e, designation: "Mentor" }, today)).toBe(false);
    expect(matchesCoverage([rule, dept], { ...e, dateOfJoining: "2025-01-01" }, today)).toBe(false);
    expect(matchesCoverage([], e, today)).toBe(false);
  });
});

describe("parseDate (HRMS formats)", () => {
  it.each([
    ["2026-03-05", "2026-03-05"],
    ["2026-03-05T00:00:00Z", "2026-03-05"],
    ["05-03-2026", "2026-03-05"],
    ["5/3/2026", "2026-03-05"],
    ["05-Mar-2026", "2026-03-05"],
    ["5 March 2026", "2026-03-05"],
    ["garbage", null],
    [null, null],
  ])("%s → %s", (input, out) => expect(parseDate(input)).toBe(out));
});
