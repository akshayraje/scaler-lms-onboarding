import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditTable } from "@/components/admin/AuditTable";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCourse } from "@/content/courses";
import { getRoster } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: `${getCourse((await params).slug)?.title ?? "Course"} report` };
}

const headCls = "font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase";

export default async function CourseReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const course = getCourse((await params).slug);
  if (!course) notFound();
  const tab = (await searchParams).tab === "activity" ? "activity" : "roster";
  const moduleCount = course.modules.length;

  const roster = (await getRoster(course.slug, course.modules.map((m) => m.id))).map((r) => ({
    ...r,
    progressPct: Math.round((Math.min(r.done, moduleCount) / moduleCount) * 100),
  }));
  const status = (r: (typeof roster)[number]) =>
    r.cert_valid ? "certified" : r.cert_code ? "expired" : r.progressPct > 0 ? "in_progress" : "not_started";
  const count = (st: string) => roster.filter((r) => status(r) === st).length;
  const stats = [
    { label: "Total employees", value: roster.length, box: "bg-muted", num: "text-navy" },
    { label: "Certified (valid)", value: count("certified"), box: "bg-success-soft", num: "text-success" },
    { label: "In progress", value: count("in_progress"), box: "bg-brand-soft", num: "text-primary" },
    { label: "Renewal due", value: count("expired"), box: "bg-danger-soft", num: "text-danger" },
    { label: "Not started", value: count("not_started"), box: "bg-muted", num: "text-muted-foreground" },
  ];

  const href = (t: string) => `/admin/courses/${course.slug}/report${t === "roster" ? "" : `?tab=${t}`}`;

  return (
    <>
      <Link href="/admin/courses" className="mb-3 inline-block text-sm font-semibold text-primary hover:underline">
        ← All courses
      </Link>
      <div className="rounded-xl border bg-card px-4 py-6 sm:px-9 sm:py-[34px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="mb-0">{course.title} — report</h2>
          <Link href={`/admin/courses/${course.slug}`} className="text-sm font-semibold text-primary hover:underline">
            Edit settings
          </Link>
        </div>


        <div className="mt-[18px] mb-1.5 grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-3.5">
          {stats.map((s) => (
            <div key={s.label} className={cn("rounded-[10px] border px-3.5 py-4 text-center", s.box)}>
              <div className={cn("font-heading text-[28px]", s.num)}>{s.value}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <nav className="mt-4 flex gap-1 border-b" aria-label="Report">
          {(["roster", "activity"] as const).map((t) => (
            <Link
              key={t}
              href={href(t)}
              aria-current={tab === t ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-primary",
                tab === t && "border-primary text-primary",
              )}
            >
              {t === "roster" ? "Roster" : "Activity"}
            </Link>
          ))}
        </nav>

        <div className="mt-2 text-[13.5px]">
          {tab === "roster" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={headCls}>Name</TableHead>
                  <TableHead className={cn(headCls, "hidden md:table-cell")}>Email</TableHead>
                  <TableHead className={headCls}>Progress</TableHead>
                  <TableHead className={cn(headCls, "hidden sm:table-cell")}>Assessment</TableHead>
                  <TableHead className={headCls}>Status</TableHead>
                  <TableHead className={cn(headCls, "hidden lg:table-cell")}>Last sign-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((r) => (
                  <TableRow key={r.email}>
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">{r.name}</div>
                      {/* Email folds under the name on small screens */}
                      <div className="text-xs [overflow-wrap:anywhere] text-muted-foreground md:hidden">{r.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{r.email}</TableCell>
                    <TableCell>{r.progressPct}%</TableCell>
                    <TableCell className="hidden sm:table-cell">{r.exam_score != null ? `${r.exam_score}%` : "-"}</TableCell>
                    <TableCell>
                      {status(r) === "certified" ? (
                        <Badge className="bg-success-soft text-success-ink" title={r.cert_code ?? undefined}>
                          Certified
                          <span className="hidden font-mono lg:inline">({r.cert_code})</span>
                        </Badge>
                      ) : status(r) === "expired" ? (
                        <Badge
                          className="bg-danger-soft text-danger-ink"
                          title={r.cert_expires_at ? `Expired ${formatDateTime(r.cert_expires_at)}` : undefined}
                        >
                          Renewal due
                        </Badge>
                      ) : status(r) === "in_progress" ? (
                        <Badge variant="secondary">In progress</Badge>
                      ) : (
                        <Badge variant="outline">Not started</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {r.last_login_at ? formatDateTime(r.last_login_at) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <AuditTable courseId={course.slug} />
          )}
        </div>
      </div>
    </>
  );
}

