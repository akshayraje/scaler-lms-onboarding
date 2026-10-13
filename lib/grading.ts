import type { ExamKey } from "./course-types";

export type GradeResult = { score: number; correctCount: number; total: number; passed: boolean };

/** Pure grading so it can be unit-tested without the server-only key modules. */
export function gradeExam(key: ExamKey, passThreshold: number, answers: unknown): GradeResult {
  const total = key.answers.length;
  if (!Array.isArray(answers) || answers.length !== total || !answers.every((a) => Number.isInteger(a))) {
    throw new Error("Invalid answer submission");
  }
  const correctCount = answers.reduce((n: number, a, i) => n + (a === key.answers[i] ? 1 : 0), 0);
  return {
    score: Math.round((correctCount / total) * 100),
    correctCount,
    total,
    passed: correctCount / total >= passThreshold,
  };
}
