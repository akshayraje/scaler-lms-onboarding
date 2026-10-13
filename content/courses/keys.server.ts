import "server-only";
import type { ExamKey } from "@/lib/course-types";
import { poshPocsoExamKey } from "./posh-pocso/exam.server";

const KEYS: Record<string, ExamKey> = {
  "posh-pocso": poshPocsoExamKey,
};

export function getExamKey(slug: string): ExamKey | undefined {
  return KEYS[slug];
}
