import type { ReactNode } from "react";
import type { CourseSettings } from "./course-settings";

// Shapes a course definition is built from. Everything here is safe to ship to
// the browser; exam answer keys live separately in each course's
// `exam.server.ts` and are only ever read by server code.

export type Reveal = { q: string; a: ReactNode };

/** Formative question (module quick checks, case-study decisions). Not graded, so fine to ship to the browser. */
export type PracticeQuestion = {
  q: string;
  options: string[];
  correct: number;
  explain: string;
};

export type ExamQuestion = { q: string; options: string[] };

export type CaseStudy = {
  tag: string;
  title: string;
  scenario: ReactNode[];
  decisions: PracticeQuestion[];
  wrapup: ReactNode;
};

type ModuleBase = {
  id: string;
  title: string;
  /**
   * Quick check shown after a lesson's content: 2–3 questions on its main points.
   * Must be answered to finish the module, but isn't scored or recorded.
   */
  checks?: PracticeQuestion[];
};

export type CourseModule = ModuleBase &
  (
    | { type: "welcome"; eyebrow: string; heading: string; body: ReactNode; nextLabel: string }
    /** Free-form page of rich content. */
    | { type: "content"; eyebrow?: string; heading: string; body: ReactNode }
    | { type: "info-reveal"; heading?: string; intro?: ReactNode; reveals: Reveal[]; extra?: ReactNode }
    | { type: "case"; caseStudy: CaseStudy }
    | {
        type: "timeline";
        heading: string;
        steps: { title: string; body: ReactNode }[];
        callout?: ReactNode;
        extra?: ReactNode;
      }
    | { type: "checklist"; heading: string; dos: ReactNode[]; donts: ReactNode[] }
    | { type: "exam"; questions: ExamQuestion[] }
    /**
     * Statements the learner must tick before a certificate is issued. The exact
     * wording is stored with each acknowledgement as audit evidence, so keep them plain text.
     */
    | { type: "acknowledgement"; heading: string; intro?: ReactNode; statements: string[]; confirmLabel: string }
    | { type: "certificate" }
  );

export type CourseDefinition = {
  slug: string;
  /** Bump when content/answers change materially; certificates record it. */
  version: number;
  title: string;
  /** Long name printed on the certificate and verification page. */
  certificateTitle: string;
  /** One line under the title (dashboard card, course sidebar). */
  summary: string;
  passThreshold: number; // 0..1
  /**
   * Initial coverage & nudge schedule, copied into the database when the course is
   * first registered. After that, admins edit them under Admin → Courses.
   */
  defaults?: CourseSettings;
  modules: CourseModule[];
};

export type ExamKey = {
  /** Index of the correct option for each exam question, in order. */
  answers: number[];
};
