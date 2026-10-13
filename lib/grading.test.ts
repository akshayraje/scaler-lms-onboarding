import { describe, expect, it } from "vitest";
import { gradeExam } from "./grading";

const key = { answers: [1, 0, 2, 1, 3] };

describe("gradeExam", () => {
  it("passes at exactly the threshold", () => {
    expect(gradeExam(key, 0.8, [1, 0, 2, 1, 0])).toEqual({ score: 80, correctCount: 4, total: 5, passed: true });
  });
  it("fails below the threshold", () => {
    expect(gradeExam(key, 0.8, [1, 0, 0, 0, 0]).passed).toBe(false);
  });
  it("rejects malformed submissions", () => {
    expect(() => gradeExam(key, 0.8, [1, 0])).toThrow();
    expect(() => gradeExam(key, 0.8, "nope")).toThrow();
    expect(() => gradeExam(key, 0.8, [1, 0, 2, 1, "3"])).toThrow();
  });
});
