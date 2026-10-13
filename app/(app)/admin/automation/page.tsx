import { count, desc, eq } from "drizzle-orm";
import { RunJobButton } from "@/components/admin/RunJobButton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JOBS, lastRunByJob, recentRuns, type JobName } from "@/lib/automation/jobs";
import { summaryText } from "@/lib/automation/summary";
import Link from "next/link";
import { db } from "@/lib/db";
import { employees, notifications } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automation · Admin" };

const headCls = "font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase";
const card = "mb-6 rounded-xl border bg-card px-4 py-6 sm:px-8 sm:py-7";

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    succeeded: "bg-success-soft text-success-ink",
    sent: "bg-success-soft text-success-ink",
    failed: "bg-danger-soft text-danger-ink",
    running: "bg-brand-soft text-primary",
    dry_run: "bg-secondary text-secondary-foreground",
    skipped: "bg-muted text-muted-foreground",
  };
  return <Badge className={cls[status] ?? ""}>{status.replace("_", " ")}</Badge>;
}


export default async function AutomationPage() {
  const [last, runs, notes, mode] = await Promise.all([
    lastRunByJob(),
    recentRuns(15),
    db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50),
    getSettings("notifications"),
  ]);
  const [{ active }] = await db.select({ active: count() }).from(employees).where(eq(employees.status, "active"));

  return (
    <>
      <section className={card}>
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="mb-0 text-xl">Scheduled jobs</h2>
          <span className="text-sm text-muted-foreground">
            Notifications: <strong className="text-foreground">{mode.mode.replace("_", " ")}</strong> · {active} active employees in the HRMS
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(Object.keys(JOBS) as JobName[]).map((name) => {
            const job = JOBS[name];
            const r = last.get(name);
            return (
              <div key={name} className="flex flex-col gap-3 rounded-[10px] border bg-muted p-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="mb-0 text-base">{job.title}</h3>
                    <span className="font-mono text-[11px] text-muted-foreground">{job.schedule}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{job.description}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r ? (
                    <>
                      Last run {formatDateTime(r.started_at)} <StatusBadge status={r.status} />
                      <div className="mt-1 break-words">{r.error ?? summaryText(r.summary)}</div>
                    </>
                  ) : (
                    "Not run yet"
                  )}
                </div>
                <div className="mt-auto">
                  <RunJobButton job={name} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Who gets each course and when they&apos;re nudged is set per course under{" "}
          <Link href="/admin/courses" className="font-semibold text-primary underline">
            Courses
          </Link>
          .
        </p>
      </section>

      <section className={card}>
        <h2 className="text-xl">Recent notifications</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={headCls}>When</TableHead>
                <TableHead className={headCls}>To</TableHead>
                <TableHead className={cn(headCls, "hidden md:table-cell")}>Campaign</TableHead>
                <TableHead className={headCls}>Channel</TableHead>
                <TableHead className={cn(headCls, "hidden lg:table-cell")}>Subject</TableHead>
                <TableHead className={headCls}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((n) => (
                <TableRow key={n.id} className="align-top">
                  <TableCell className="text-xs whitespace-normal sm:whitespace-nowrap">{formatDateTime(n.createdAt)}</TableCell>
                  <TableCell className="text-xs whitespace-normal [overflow-wrap:anywhere]">
                    {n.recipient}
                    {n.cc && <div className="text-muted-foreground">cc {n.cc}</div>}
                  </TableCell>
                  <TableCell className="hidden text-xs md:table-cell">
                    {n.campaign.replace("_", " ")} · step {n.step + 1}
                  </TableCell>
                  <TableCell className="text-xs">{n.channel}</TableCell>
                  <TableCell className="hidden max-w-xs text-xs whitespace-normal lg:table-cell" title={n.body ?? undefined}>
                    {n.subject}
                  </TableCell>
                  <TableCell className="text-xs">
                    <StatusBadge status={n.status} />
                    {n.error && <div className="mt-1 max-w-48 whitespace-normal text-danger-ink">{n.error}</div>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className={card}>
        <h2 className="text-xl">Run history</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={headCls}>Started</TableHead>
              <TableHead className={headCls}>Job</TableHead>
              <TableHead className={headCls}>Status</TableHead>
              <TableHead className={cn(headCls, "hidden md:table-cell")}>By</TableHead>
              <TableHead className={cn(headCls, "hidden md:table-cell")}>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id} className="align-top">
                <TableCell className="text-xs">{formatDateTime(r.startedAt)}</TableCell>
                <TableCell className="text-xs">{JOBS[r.job as JobName]?.title ?? r.job}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="hidden text-xs md:table-cell">{r.triggeredBy}</TableCell>
                <TableCell className="hidden max-w-md text-xs whitespace-normal md:table-cell">{r.error ?? summaryText(r.summary)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </>
  );
}
