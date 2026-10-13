import Link from "next/link";
import { COURSES } from "@/content/courses";
import { Badge } from "@/components/ui/badge";
import { describeRule, describeStep } from "@/lib/course-settings";
import { getAllCourseSettings } from "@/lib/course-settings-store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courses" };

export default async function CoursesAdminPage() {
  const all = await getAllCourseSettings();
  return (
    <div className="grid gap-4">
      {COURSES.map((c) => {
        const s = all.get(c.slug)!;
        return (
          <section key={c.slug} className="rounded-xl border bg-card px-4 py-6 sm:px-8 sm:py-7">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="mb-1 text-xl">{c.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {c.summary} · {c.modules.length} modules
                  {s.certificate.validityMonths ? ` · certificate valid ${s.certificate.validityMonths} months` : " · certificate never expires"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/courses/${c.slug}/report`}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold text-primary hover:border-primary"
                >
                  View report
                </Link>
                <Link
                  href={`/admin/courses/${c.slug}`}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold text-primary hover:border-primary"
                >
                  Edit settings
                </Link>
              </div>
            </div>
            <dl className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="mb-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Coverage</dt>
                <dd>
                  {s.coverage.enabled ? (
                    <>
                      {s.coverage.rules.map((r, i) => (
                        <div key={r.id}>
                          {i > 0 && <span className="text-muted-foreground">and </span>}
                          {describeRule(r)}
                        </div>
                      ))}
                      <div className="text-muted-foreground">Due {s.coverage.dueInDays} days after assignment</div>
                    </>
                  ) : (
                    <Badge variant="outline">Manual only</Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="mb-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Nudges after assignment</dt>
                <dd className="text-muted-foreground">
                  {s.nudges.assignment.length ? s.nudges.assignment.map((st) => describeStep(st, "assignment")).join(" · ") : "None"}
                </dd>
              </div>
              {s.certificate.validityMonths && (
                <div>
                  <dt className="mb-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Renewal nudges</dt>
                  <dd className="text-muted-foreground">
                    {s.nudges.renewal.length ? s.nudges.renewal.map((st) => describeStep(st, "renewal")).join(" · ") : "None"}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
