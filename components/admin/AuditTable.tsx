import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuditLog } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const headCls = "font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase";

/** Audit events, newest first. Pass `courseId` to show only that course's events. */
export async function AuditTable({ courseId, limit = 200 }: { courseId?: string; limit?: number }) {
  const rows = await getAuditLog(limit, courseId);
  if (!rows.length) return <p className="py-4 text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={headCls}>When</TableHead>
          <TableHead className={cn(headCls, "hidden sm:table-cell")}>Email</TableHead>
          <TableHead className={cn(headCls, "hidden sm:table-cell")}>Action</TableHead>
          {!courseId && <TableHead className={cn(headCls, "hidden md:table-cell")}>Course</TableHead>}
          <TableHead className={cn(headCls, "hidden sm:table-cell")}>Detail</TableHead>
          <TableHead className={cn(headCls, "sm:hidden")}>Event</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className="align-top">
            <TableCell className="text-xs whitespace-normal sm:text-[13.5px] sm:whitespace-nowrap">
              {formatDateTime(r.createdAt)}
            </TableCell>
            <TableCell className="hidden sm:table-cell">{r.email ?? "-"}</TableCell>
            <TableCell className="hidden font-mono text-xs sm:table-cell">{r.action}</TableCell>
            {!courseId && <TableCell className="hidden md:table-cell">{r.courseId ?? "-"}</TableCell>}
            <TableCell className="hidden font-mono text-xs sm:table-cell">{r.detail ?? ""}</TableCell>
            {/* Phones: one stacked cell instead of a wide scrolling row */}
            <TableCell className="whitespace-normal sm:hidden">
              <div className="font-mono text-xs font-medium">{r.action}</div>
              <div className="text-xs [overflow-wrap:anywhere] text-muted-foreground">{r.email ?? "-"}</div>
              {r.detail && <div className="font-mono text-[11px] [overflow-wrap:anywhere] text-muted-foreground">{r.detail}</div>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
