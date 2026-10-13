import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Building blocks for course screens and course content files. Content authors
// use these instead of raw class names so every course shares one look.

export function CourseCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "mb-6 rounded-xl border bg-card px-5 py-6 sm:px-9 sm:py-[34px] [&>p]:my-4 print:border-0 print:p-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <span
      className={cn(
        "mb-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-brand before:mr-2 before:content-['—']",
        // Centered eyebrows flow as text so the dash stays attached when the label wraps.
        center ? "block text-center" : "flex items-center",
      )}
    >
      {children}
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "mb-3 inline-block rounded-full bg-brand-soft px-2.5 py-1 font-mono text-[11px] text-secondary-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function QCount({ children }: { children: ReactNode }) {
  return <div className="mb-3.5 font-mono text-xs text-muted-foreground">{children}</div>;
}

export function ScenarioBox({ children }: { children: ReactNode }) {
  return (
    <div className="my-[18px] rounded-r-[10px] border-l-[3px] border-brand bg-tint px-4 py-4 text-[15px] leading-relaxed sm:px-5">
      {children}
    </div>
  );
}

export function PlainList({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={cn("list-disc space-y-2 pl-[18px] text-[14.5px] leading-normal", className)}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function TileGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("my-5 grid gap-3.5 sm:grid-cols-2", className)}>{children}</div>;
}

export function InfoTile({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[10px] bg-tint px-[18px] py-4">
      <strong className="text-sm">{title}</strong>
      <p className="mt-1 text-[13.5px] text-muted-foreground">{children}</p>
    </div>
  );
}

export function Feedback({ correct, children }: { correct: boolean | null; children?: ReactNode }) {
  if (correct === null) return null;
  return (
    <div
      role="status"
      className={cn(
        "mt-3.5 rounded-[10px] px-4 py-3.5 text-sm",
        correct ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink",
      )}
    >
      {children}
    </div>
  );
}
