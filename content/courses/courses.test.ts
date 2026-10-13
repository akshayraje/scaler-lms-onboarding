import { describe, expect, it } from "vitest";
import { COURSES } from ".";
import { getExamKey } from "./keys.server";

// Guards for authoring mistakes that would silently break grading or integrity.
describe.each(COURSES.map((c) => [c.slug, c] as const))("course %s", (_slug, course) => {
  it("has unique module ids", () => {
    const ids = course.modules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  const exam = course.modules.find((m) => m.type === "exam");
  if (!exam || exam.type !== "exam") return;
  const key = getExamKey(course.slug)!;

  it("answer key matches the exam questions", () => {
    expect(key.answers).toHaveLength(exam.questions.length);
    key.answers.forEach((a, i) => expect(a).toBeLessThan(exam.questions[i].options.length));
  });

  it("can't be passed by always picking the same option position", () => {
    for (let pos = 0; pos < 4; pos++) {
      const share = key.answers.filter((a) => a === pos).length / key.answers.length;
      expect(share).toBeLessThan(course.passThreshold);
      expect(share).toBeLessThanOrEqual(0.4);
    }
  });
});

describe.each(COURSES.map((c) => [c.slug, c] as const))("course %s practice questions", (_slug, course) => {
  const practice = course.modules.flatMap((m) => [
    ...(m.checks ?? []).map((q) => ({ where: `${m.id} quick check`, q })),
    ...(m.type === "case" ? m.caseStudy.decisions.map((q) => ({ where: `${m.id} decision`, q })) : []),
  ]);

  it.each(practice.map((p) => [p.where, p.q.q, p.q] as const))("%s: %s", (_w, _t, q) => {
    expect(q.correct).toBeGreaterThanOrEqual(0);
    expect(q.correct).toBeLessThan(q.options.length);
    expect(q.explain.length).toBeGreaterThan(0);
  });
});
