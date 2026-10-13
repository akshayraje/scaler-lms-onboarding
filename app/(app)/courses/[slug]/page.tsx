import { notFound } from "next/navigation";
import { getCourse } from "@/content/courses";
import { CoursePlayer } from "@/components/course/CoursePlayer";
import { getCertificationStatus } from "@/lib/certification";
import { getCourseSettings } from "@/lib/course-settings-store";
import { getCompletedModules } from "@/lib/progress";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const course = getCourse((await params).slug);
  return { title: course ? course.title : "Course" };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();
  const user = await requireUser();
  const [completed, status, settings] = await Promise.all([
    getCompletedModules(user.id, slug),
    getCertificationStatus(user.id, slug),
    getCourseSettings(slug),
  ]);

  // Gated steps count as done only if satisfied in the current certification cycle,
  // so an expired certificate sends the learner back to the assessment.
  const gateMet = (type: string) =>
    !!status.valid ||
    (type === "exam" && !!status.passedAttempt) ||
    (type === "acknowledgement" && status.acknowledged);
  const done = course.modules
    .filter((m) => completed.includes(m.id))
    .filter((m) => !["exam", "acknowledgement", "certificate"].includes(m.type) || gateMet(m.type))
    .map((m) => m.id);

  return (
    <CoursePlayer
      slug={slug}
      initialCompleted={done}
      renewalDue={!!status.expired && !status.valid}
      validityMonths={settings.certificate.validityMonths}
    />
  );
}
