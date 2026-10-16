"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { completeModule } from "@/app/actions/course";
import { ProgressBar } from "@/components/ProgressBar";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getCourse } from "@/content/courses";
import type { CourseDefinition } from "@/lib/course-types";
import { cn } from "@/lib/utils";
import { CourseInfo } from "./context";
import { MODULE_KINDS, moduleKind } from "./module-kind";
import { ModuleView } from "./modules";
import { reloadIfOutdated } from "./outdated";

export type PlayerProps = {
  slug: string;
  initialCompleted: string[];
  /** Certificate expired: the learner needs to retake the assessment. */
  renewalDue?: boolean;
  /** From the course's admin settings; shown in content (null = never expires). */
  validityMonths: number | null;
};

export function CoursePlayer({ slug, initialCompleted, renewalDue, validityMonths }: PlayerProps) {
  // Content is imported on the client (it may contain JSX); only ids cross the server boundary.
  const course = getCourse(slug)!;
  const modules = course.modules;
  const [completed, setCompleted] = useState(() => new Set(initialCompleted));
  // Resume at the first module not yet done (modules can be added to a course over time).
  const [current, setCurrent] = useState(() => {
    const i = modules.findIndex((m) => !initialCompleted.includes(m.id));
    return i === -1 ? modules.length - 1 : i;
  });
  const [navOpen, setNavOpen] = useState(false);

  const doneIdx = useMemo(
    () => modules.map((m, i) => (completed.has(m.id) ? i : -1)).filter((i) => i >= 0),
    [modules, completed],
  );
  const maxUnlocked = Math.max(...doneIdx, -1) + 1;
  const pct = (completed.size / modules.length) * 100;

  function markComplete(i: number) {
    const id = modules[i].id;
    setCompleted((prev) => new Set(prev).add(id));
    // If the app was redeployed meanwhile, reload: the course resumes at this (unsaved) module.
    completeModule(slug, id).catch((e) => reloadIfOutdated(e) || console.error(e));
  }

  function show(i: number) {
    setCurrent(i);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goTo(i: number) {
    if (i < 0 || i >= modules.length) return;
    if (i > maxUnlocked && !completed.has(modules[i].id)) return; // locked
    show(i);
  }

  // The next module unlocks as part of completing this one, so bypass the lock check.
  function completeAndAdvance() {
    markComplete(current);
    if (current + 1 < modules.length) show(current + 1);
  }

  const mod = modules[current];
  const corridor = (
    <Corridor course={course} completed={completed} current={current} maxUnlocked={maxUnlocked} onSelect={goTo} />
  );
  const progressMeta = (
    <div className="mt-1.5 flex justify-between font-mono text-[11.5px] text-muted-foreground">
      <span>
        Module {current + 1} of {modules.length}
      </span>
      <span>{Math.round(pct)}% complete</span>
    </div>
  );

  return (
    <CourseInfo.Provider value={{ validityMonths }}>
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[1180px] flex-col md:flex-row">
      {/* Desktop: the "corridor" rail, pinned under the 56px top nav */}
      <nav className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[250px] shrink-0 overflow-y-auto bg-navy py-7 text-[#e7ecf9] md:block print:hidden">
        {corridor}
      </nav>

      {/* Mobile: slim course bar under the top nav; the corridor opens in a drawer */}
      <header className="sticky top-14 z-30 bg-navy text-white md:hidden print:hidden">
        <div className="flex items-center gap-3 px-4 py-2">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <button
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
                aria-label="Open course modules"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[86%] max-w-xs gap-0 overflow-y-auto border-r-0 bg-navy py-6 text-[#e7ecf9] [&>[data-slot=sheet-close]]:text-white [&>[data-slot=sheet-close]]:hover:bg-white/10"
            >
              <SheetTitle className="sr-only">{course.title} modules</SheetTitle>
              <SheetDescription className="sr-only">Jump to any unlocked module</SheetDescription>
              {corridor}
            </SheetContent>
          </Sheet>
          <div className="min-w-0 truncate font-heading text-base font-semibold">{course.title}</div>
          <span className="ml-auto shrink-0 font-mono text-[11px] text-white/70">
            {current + 1}/{modules.length}
          </span>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pt-4 pb-16 sm:px-6 md:px-11 md:pt-9 md:pb-20 print:p-0">
        <div className="mb-5 md:mb-[34px] print:hidden">
          <ProgressBar value={pct} />
          {progressMeta}
        </div>
        {renewalDue && (
          <div role="status" className="mb-5 rounded-[10px] border border-brand/40 bg-brand-soft px-4 py-3 text-sm text-secondary-foreground">
            <strong>Annual refresher due.</strong> Your certificate has expired — review any module you like, then retake
            the final assessment to renew it.
          </div>
        )}
        <ModuleView
          key={mod.id}
          slug={slug}
          mod={mod}
          isFirst={current === 0}
          passThreshold={course.passThreshold}
          onBack={() => goTo(current - 1)}
          onNext={completeAndAdvance}
          onMarkComplete={() => markComplete(current)}
        />
      </main>
    </div>
    </CourseInfo.Provider>
  );
}

function Corridor({
  course,
  completed,
  current,
  maxUnlocked,
  onSelect,
}: {
  course: CourseDefinition;
  completed: Set<string>;
  current: number;
  maxUnlocked: number;
  onSelect: (i: number) => void;
}) {
  return (
    <>
      <div className="mb-2 border-b border-white/12 px-[22px] pb-5">
        <Link
          href="/"
          className="mb-3.5 inline-block font-mono text-xs text-white/65 no-underline hover:text-white"
        >
          ← All courses
        </Link>
        <h2 className="mb-0 text-xl text-white">{course.title}</h2>
        <p className="mt-1.5 text-[12.5px] text-white/65">{course.summary}</p>
      </div>
      <ol className="py-3">
        {course.modules.map((m, i) => {
          const done = completed.has(m.id);
          const active = i === current;
          const locked = i > maxUnlocked && !done;
          const kind = MODULE_KINDS[moduleKind(m.type)];
          return (
            <li key={m.id}>
              <button
                disabled={locked}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(i)}
                className={cn(
                  "flex w-full items-start gap-3 py-2.5 pr-[22px] pl-5 text-left opacity-60 transition-opacity hover:opacity-95",
                  done && "opacity-85",
                  active && "opacity-100",
                  locked && "cursor-not-allowed opacity-35 hover:opacity-35",
                )}
              >
                {/* Icon shows the module kind; colour shows status (green = done, blue = current). */}
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border border-white/30 text-white/85",
                    done && "border-success bg-success text-white",
                    active && "border-brand bg-brand text-navy ring-4 ring-brand/25",
                  )}
                >
                  <kind.Icon className="size-3.5" aria-hidden />
                </span>
                <span className="pt-px text-[13.5px] leading-snug">
                  <span className="mb-0.5 block font-mono text-[10px] tracking-[0.04em] text-brand uppercase">
                    Module {i + 1} · {kind.label}
                  </span>
                  {m.title}
                  {done && <span className="sr-only"> (completed)</span>}
                  {locked && <span className="sr-only"> (locked)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}
