import Link from "next/link";
import { ProgressBar } from "@/components/ProgressBar";
import { Pill } from "@/components/course/kit";
import { COURSES } from "@/content/courses";
import { getDashboardSummary } from "@/lib/progress";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();
  const summary = await getDashboardSummary(user.id);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-10">
      <h1>Your courses</h1>
      <div className="mt-5 grid gap-[18px] sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
        {COURSES.map((c) => {
          const s = summary.get(c.slug) ?? { doneIds: [], certified: false, renewalDue: false, validUntil: null };
          // Count only modules that still exist (content can change after learners start).
          const done = c.modules.filter((m) => s.doneIds.includes(m.id)).length;
          const pct = Math.round((done / c.modules.length) * 100);
          const minutes = c.modules.reduce((a, m) => a + m.est, 0);
          return (
            <Link
              key={c.slug}
              href={`/courses/${c.slug}`}
              className="flex flex-col gap-2.5 rounded-xl border bg-card p-5 transition-colors hover:border-primary sm:p-6"
            >
              <Pill className={cn("mb-0 self-start", s.renewalDue && "bg-danger-soft text-danger-ink")}>
                {s.certified ? "Certified ✓" : s.renewalDue ? "Renewal due" : pct > 0 ? "In progress" : "Not started"}
              </Pill>
              <h2 className="mb-0 text-xl">{c.title}</h2>
              <p className="text-sm text-muted-foreground">{c.summary}</p>
              <div className="mt-auto pt-2">
                <ProgressBar value={pct} />
                <div className="mt-1.5 flex justify-between font-mono text-[11.5px] text-muted-foreground">
                  <span>{s.certified && s.validUntil ? `Valid till ${formatDate(s.validUntil)}` : `${pct}% complete`}</span>
                  <span>~{minutes} min</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
