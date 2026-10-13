import type { CourseDefinition } from "@/lib/course-types";
import { poshPocso } from "./posh-pocso/course";

// Register new courses here. Order = order on the learner dashboard.
export const COURSES: CourseDefinition[] = [poshPocso];

export function getCourse(slug: string): CourseDefinition | undefined {
  return COURSES.find((c) => c.slug === slug);
}
