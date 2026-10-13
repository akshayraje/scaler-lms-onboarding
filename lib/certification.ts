import "server-only";
import crypto from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import type { CourseDefinition } from "./course-types";
import { getCourseSettings } from "./course-settings-store";
import { addMonths } from "./dates";
import { db } from "./db";
import { acknowledgements, assessmentAttempts, certificates, enrollments } from "./db/schema";

// Certification rules, in one place:
//  - A certificate is issued once the learner has passed the exam (if the course has
//    one) AND acknowledged the policy (if it has an acknowledgement step).
//  - Certificates can expire (course setting certificate.validityMonths). After expiry a new "cycle"
//    starts: only attempts/acknowledgements made after the expiry count towards
//    the next certificate, so the learner must retake the exam and re-acknowledge.

export const hasExam = (c: CourseDefinition) => c.modules.some((m) => m.type === "exam");
export const hasAcknowledgement = (c: CourseDefinition) => c.modules.some((m) => m.type === "acknowledgement");

export type CertificationStatus = {
  /** Current, unexpired certificate. */
  valid: typeof certificates.$inferSelect | null;
  /** Most recent certificate, if it has expired (renewal due). */
  expired: typeof certificates.$inferSelect | null;
  /** Latest passing attempt in the current cycle. */
  passedAttempt: typeof assessmentAttempts.$inferSelect | null;
  /** Acknowledged in the current cycle. */
  acknowledged: boolean;
};

export async function getCertificationStatus(userId: string, courseId: string): Promise<CertificationStatus> {
  const [latest] = await db
    .select()
    .from(certificates)
    .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)))
    .orderBy(desc(certificates.issuedAt))
    .limit(1);

  const now = new Date();
  const isValid = !!latest && (!latest.expiresAt || latest.expiresAt > now);
  // While a certificate is valid, the cycle is the one that produced it.
  const cycleStart = !latest ? new Date(0) : isValid ? new Date(0) : latest.expiresAt!;

  const [passedAttempt] = await db
    .select()
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.userId, userId),
        eq(assessmentAttempts.courseId, courseId),
        eq(assessmentAttempts.passed, true),
        gt(assessmentAttempts.submittedAt, cycleStart),
      ),
    )
    .orderBy(desc(assessmentAttempts.submittedAt))
    .limit(1);

  const [ack] = await db
    .select({ id: acknowledgements.id })
    .from(acknowledgements)
    .where(
      and(
        eq(acknowledgements.userId, userId),
        eq(acknowledgements.courseId, courseId),
        gt(acknowledgements.acknowledgedAt, cycleStart),
      ),
    )
    .limit(1);

  return {
    valid: isValid ? latest : null,
    expired: latest && !isValid ? latest : null,
    passedAttempt: passedAttempt ?? null,
    acknowledged: !!ack,
  };
}

/** Issue a certificate if every requirement is met and none is currently valid. Returns the new code, if any. */
export async function issueCertificateIfEligible(userId: string, course: CourseDefinition): Promise<string | null> {
  const s = await getCertificationStatus(userId, course.slug);
  if (s.valid) return null;
  if (hasExam(course) && !s.passedAttempt) return null;
  if (hasAcknowledgement(course) && !s.acknowledged) return null;

  const issuedAt = new Date();
  const { validityMonths } = (await getCourseSettings(course.slug)).certificate;
  const expiresAt = validityMonths ? addMonths(issuedAt, validityMonths) : null;
  const code = crypto.randomBytes(6).toString("hex").toUpperCase();
  await db.insert(certificates).values({
    userId,
    courseId: course.slug,
    courseVersion: course.version,
    code,
    score: s.passedAttempt?.score ?? 100,
    issuedAt,
    expiresAt,
  });
  await db
    .update(enrollments)
    .set({ status: "completed", completedAt: issuedAt })
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, course.slug)));
  return code;
}
