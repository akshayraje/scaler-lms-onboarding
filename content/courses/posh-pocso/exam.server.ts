import "server-only";
import type { ExamKey } from "@/lib/course-types";

// Authoritative answer key — never imported by client code. Indices refer to
// the option order as authored in course.tsx (the UI shuffles options per
// attempt and submits these original indices). Correct positions are spread
// across A–D so no single-letter strategy can pass.
export const poshPocsoExamKey: ExamKey = {
  answers: [3, 0, 2, 1, 0, 3, 2, 1, 3, 0, 2, 3, 1, 0, 2, 1, 2, 0, 3, 2],
};
