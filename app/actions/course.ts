"use server";

import { and, eq } from "drizzle-orm";
import { getCourse } from "@/content/courses";
import { getExamKey } from "@/content/courses/keys.server";
import { audit, requestIp } from "@/lib/audit";
import { getCertificationStatus, issueCertificateIfEligible } from "@/lib/certification";
import { db } from "@/lib/db";
import { acknowledgements, assessmentAttempts, moduleProgress } from "@/lib/db/schema";
import { gradeExam, type GradeResult } from "@/lib/grading";
import { touchEnrollment } from "@/lib/progress";
import { getCurrentUser } from "@/lib/session";

async function context(slug: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const course = getCourse(slug);
  if (!course) throw new Error("Unknown course");
  return { user, course };
}

export async function completeModule(slug: string, moduleId: string): Promise<string[]> {
  const { user, course } = await context(slug);
  const mod = course.modules.find((m) => m.id === moduleId);
  if (!mod) throw new Error("Invalid module id");

  // Gated steps only count once their requirement is met in the current cycle.
  if (mod.type === "exam" || mod.type === "acknowledgement" || mod.type === "certificate") {
    const s = await getCertificationStatus(user.id, course.slug);
    if (mod.type === "exam" && !s.passedAttempt && !s.valid) throw new Error("Pass the final assessment first.");
    if (mod.type === "acknowledgement" && !s.acknowledged && !s.valid) throw new Error("Acknowledge the policy first.");
    if (mod.type === "certificate" && !s.valid) throw new Error("No valid certificate yet.");
  }

  await touchEnrollment(user.id, course.slug);
  const inserted = await db
    .insert(moduleProgress)
    .values({ userId: user.id, courseId: course.slug, moduleId })
    .onConflictDoNothing()
    .returning();
  if (inserted.length) {
    await audit({ userId: user.id, email: user.email, action: "module_complete", courseId: course.slug, detail: `module=${moduleId}` });
  }

  const rows = await db
    .select({ moduleId: moduleProgress.moduleId })
    .from(moduleProgress)
    .where(and(eq(moduleProgress.userId, user.id), eq(moduleProgress.courseId, course.slug)));
  return rows.map((r) => r.moduleId);
}

export type ExamOutcome = GradeResult & {
  /** Correct option index per question — only returned once the learner has passed. */
  review?: number[];
};

/**
 * Grades on the server. Answers are original option indices (the UI shuffles
 * display order). Correct answers are revealed only after a pass, so a failed
 * attempt doesn't hand out the key for the retake.
 */
export async function submitExam(slug: string, answers: number[]): Promise<ExamOutcome> {
  const { user, course } = await context(slug);
  const key = getExamKey(course.slug);
  if (!key) throw new Error("This course has no assessment");
  const result = gradeExam(key, course.passThreshold, answers);

  await touchEnrollment(user.id, course.slug);
  await db.insert(assessmentAttempts).values({
    userId: user.id,
    courseId: course.slug,
    courseVersion: course.version,
    answers,
    score: result.score,
    correctCount: result.correctCount,
    total: result.total,
    passed: result.passed,
  });
  await audit({
    userId: user.id,
    email: user.email,
    action: "exam_submit",
    courseId: course.slug,
    detail: `score=${result.score} passed=${result.passed}`,
  });

  if (result.passed) await issueAndAudit(user, course.slug);
  return result.passed ? { ...result, review: key.answers } : result;
}

/** Records the policy acknowledgement (with the exact wording) and issues the certificate if now eligible. */
export async function acknowledgePolicy(slug: string): Promise<{ ok: true }> {
  const { user, course } = await context(slug);
  const mod = course.modules.find((m) => m.type === "acknowledgement");
  if (!mod || mod.type !== "acknowledgement") throw new Error("This course has no acknowledgement step");

  const s = await getCertificationStatus(user.id, course.slug);
  if (course.modules.some((m) => m.type === "exam") && !s.passedAttempt && !s.valid) {
    throw new Error("Pass the final assessment first.");
  }

  await db.insert(acknowledgements).values({
    userId: user.id,
    courseId: course.slug,
    courseVersion: course.version,
    statements: mod.statements,
    ip: await requestIp(),
  });
  await audit({ userId: user.id, email: user.email, action: "policy_acknowledged", courseId: course.slug });
  await issueAndAudit(user, course.slug);
  return { ok: true };
}

async function issueAndAudit(user: { id: string; email: string }, slug: string) {
  const code = await issueCertificateIfEligible(user.id, getCourse(slug)!);
  if (code) await audit({ userId: user.id, email: user.email, action: "certificate_issued", courseId: slug, detail: code });
}

export type Transcript = {
  name: string;
  email: string;
  title: string;
  course: string;
  score: number;
  issuedAt: string;
  expiresAt: string | null;
  certCode: string;
};

export async function getTranscript(slug: string): Promise<Transcript | { error: string }> {
  const { user, course } = await context(slug);
  const { valid } = await getCertificationStatus(user.id, course.slug);
  if (!valid) return { error: "No valid certificate on file yet — complete the assessment and acknowledgement first." };
  return {
    name: user.name,
    email: user.email,
    title: course.title,
    course: course.certificateTitle,
    score: valid.score,
    issuedAt: valid.issuedAt.toISOString(),
    expiresAt: valid.expiresAt?.toISOString() ?? null,
    certCode: valid.code,
  };
}
