"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  acknowledgePolicy,
  getTranscript,
  submitExam,
  type ExamOutcome,
  type Transcript,
} from "@/app/actions/course";
import { ColleaguesIllustration } from "@/components/ColleaguesIllustration";
import { Button } from "@/components/ui/button";
import type { CourseModule, PracticeQuestion } from "@/lib/course-types";
import { cn } from "@/lib/utils";
import { CourseCard, Eyebrow, Feedback, Pill, PlainList, QCount, ScenarioBox, TileGrid } from "./kit";

// React ports of the original render* functions, one component per module type.

type Of<T extends CourseModule["type"]> = Extract<CourseModule, { type: T }>;

type ViewProps = {
  slug: string;
  mod: CourseModule;
  isFirst: boolean;
  passThreshold: number;
  onBack: () => void;
  onNext: () => void;
  onMarkComplete: () => void;
  /** Overrides a lesson's primary button label (e.g. when a quick check follows). */
  nextLabel?: string;
};

/**
 * Renders a module. Lessons with `checks` show their content first, then a short
 * quick check (one question per screen) before the module counts as complete.
 */
export function ModuleView(p: ViewProps) {
  const checks = p.mod.checks ?? [];
  const [stage, setStage] = useState(-1); // -1 = content, n = quick-check question n

  function goStage(n: number) {
    setStage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (checks.length && stage >= 0) {
    const last = stage === checks.length - 1;
    return (
      <PracticeStep
        key={stage}
        item={checks[stage]}
        header={<Eyebrow>Quick check · {p.mod.title}</Eyebrow>}
        count={`Question ${stage + 1} of ${checks.length}`}
        nextLabel={last ? "Finish module" : "Next question"}
        isFirst={false}
        onBack={() => goStage(stage - 1)}
        onNext={last ? p.onNext : () => goStage(stage + 1)}
      />
    );
  }
  return (
    <ModuleBody
      {...p}
      onNext={checks.length ? () => goStage(0) : p.onNext}
      nextLabel={checks.length ? "Quick check →" : undefined}
    />
  );
}

function ModuleBody(p: ViewProps) {
  const { mod } = p;
  switch (mod.type) {
    case "welcome":
      return <Welcome {...p} mod={mod} />;
    case "content":
      return <Content {...p} mod={mod} />;
    case "info-reveal":
      return <InfoReveal {...p} mod={mod} />;
    case "case":
      return <Case {...p} mod={mod} />;
    case "timeline":
      return <Timeline {...p} mod={mod} />;
    case "checklist":
      return <Checklist {...p} mod={mod} />;
    case "exam":
      return <Exam {...p} mod={mod} />;
    case "acknowledgement":
      return <Acknowledgement {...p} mod={mod} />;
    case "certificate":
      return <Certificate {...p} />;
  }
}

/* ------------------------------------------------------------------------ */
/* Shared pieces                                                            */
/* ------------------------------------------------------------------------ */

function NavButtons({
  isFirst,
  onBack,
  label,
  onNext,
  disabled,
}: {
  isFirst: boolean;
  onBack: () => void;
  label: string;
  onNext: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-7 flex items-center justify-between gap-3 print:hidden">
      <Button variant="ghost-link" size="cta" onClick={onBack} className={cn("px-2 sm:px-4", isFirst && "invisible")}>
        ← Back
      </Button>
      {/* Full-width primary action on phones for an easy thumb target. */}
      <Button variant="brand" size="cta" onClick={onNext} disabled={disabled} className="max-sm:flex-1" data-next>
        {label}
      </Button>
    </div>
  );
}

const optionBase =
  "w-full rounded-[10px] border-[1.5px] bg-card px-4 py-3.5 text-left text-[14.5px] leading-snug text-foreground transition-colors enabled:hover:border-primary disabled:cursor-default";

/** Option list that reveals the right answer once one is picked. */
function Options({
  options,
  picked,
  correct,
  onPick,
  disabled,
}: {
  options: string[];
  picked: number | null;
  correct: number | null;
  onPick: (i: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="my-[18px] flex flex-col gap-2.5">
      {options.map((o, i) => {
        const state =
          correct !== null && i === correct ? "correct" : correct !== null && i === picked ? "incorrect" : null;
        return (
          <button
            key={i}
            data-option
            className={cn(
              optionBase,
              state === "correct" && "border-success bg-success-soft",
              state === "incorrect" && "border-danger bg-danger-soft",
            )}
            disabled={picked !== null || disabled}
            onClick={() => onPick(i)}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Module types                                                             */
/* ------------------------------------------------------------------------ */

function Welcome({ mod, isFirst, onBack, onNext }: ViewProps & { mod: Of<"welcome"> }) {
  return (
    <CourseCard>
      <div className="-mx-5 -mt-6 mb-6 flex justify-center rounded-xl border bg-[radial-gradient(ellipse_480px_320px_at_50%_40%,#e4ecfb_0%,#fff_72%)] p-6 sm:-mx-9 sm:-mt-[34px]">
        <ColleaguesIllustration className="h-auto w-32 sm:w-[170px]" />
      </div>
      <Eyebrow>{mod.eyebrow}</Eyebrow>
      <h1>{mod.heading}</h1>
      {mod.body}
      <NavButtons isFirst={isFirst} onBack={onBack} label={mod.nextLabel} onNext={onNext} />
    </CourseCard>
  );
}

function Content({ mod, isFirst, onBack, onNext, nextLabel }: ViewProps & { mod: Of<"content"> }) {
  return (
    <CourseCard>
      {mod.eyebrow && <Eyebrow>{mod.eyebrow}</Eyebrow>}
      <h1>{mod.heading}</h1>
      {mod.body}
      <NavButtons isFirst={isFirst} onBack={onBack} label={nextLabel ?? "Continue"} onNext={onNext} />
    </CourseCard>
  );
}

function InfoReveal({ mod, isFirst, onBack, onNext, nextLabel }: ViewProps & { mod: Of<"info-reveal"> }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  return (
    <CourseCard>
      <Eyebrow>{mod.title}</Eyebrow>
      <h1>{mod.heading ?? mod.title}</h1>
      {mod.intro}
      <TileGrid>
        {mod.reveals.map((r, i) => {
          const isOpen = open.has(i);
          return (
            <button
              key={i}
              aria-expanded={isOpen}
              onClick={() => toggle(i)}
              className="flex flex-col justify-start rounded-[10px] border bg-muted px-[18px] py-4 text-left transition-colors hover:border-primary"
            >
              <span className="flex items-center justify-between gap-3 text-[14.5px] font-semibold">
                {r.q} <span className="font-mono text-brand">{isOpen ? "–" : "+"}</span>
              </span>
              {/* grid-rows trick animates height without a fixed max-height */}
              <span
                className={cn(
                  "grid text-sm text-muted-foreground transition-all duration-300",
                  isOpen ? "mt-2.5 grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <span className="min-h-0 overflow-hidden">{r.a}</span>
              </span>
            </button>
          );
        })}
      </TileGrid>
      {mod.extra}
      <NavButtons isFirst={isFirst} onBack={onBack} label={nextLabel ?? "Continue"} onNext={onNext} />
    </CourseCard>
  );
}

function PracticeStep({
  item,
  header,
  count,
  nextLabel,
  isFirst,
  onBack,
  onNext,
}: {
  item: PracticeQuestion;
  header: ReactNode;
  count: string;
  nextLabel: string;
  isFirst: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <CourseCard>
      {header}
      <QCount>{count}</QCount>
      <h2 className="text-lg sm:text-xl">{item.q}</h2>
      <Options options={item.options} picked={picked} correct={picked === null ? null : item.correct} onPick={setPicked} />
      <Feedback correct={picked === null ? null : picked === item.correct}>{item.explain}</Feedback>
      <NavButtons isFirst={isFirst} onBack={onBack} label={nextLabel} onNext={onNext} disabled={picked === null} />
    </CourseCard>
  );
}

function Case({ mod, isFirst, onBack, onNext }: ViewProps & { mod: Of<"case"> }) {
  const c = mod.caseStudy;
  const [idx, setIdx] = useState(-1); // -1 = scenario intro
  if (idx === -1) {
    return (
      <CourseCard>
        <Pill>{c.tag}</Pill>
        <h1>{c.title}</h1>
        {c.scenario.map((p, i) => (
          <ScenarioBox key={i}>{p}</ScenarioBox>
        ))}
        <p className="text-muted-foreground">Read the scenario, then work through what you&apos;d do next.</p>
        <NavButtons isFirst={isFirst} onBack={onBack} label="Start the decisions" onNext={() => setIdx(0)} />
      </CourseCard>
    );
  }
  if (idx < c.decisions.length) {
    return (
      <PracticeStep
        key={idx}
        item={c.decisions[idx]}
        header={<Pill>{c.tag}</Pill>}
        count={`Decision ${idx + 1} of ${c.decisions.length}`}
        nextLabel={idx === c.decisions.length - 1 ? "See what happens next" : "Next decision"}
        isFirst={isFirst}
        onBack={onBack}
        onNext={() => setIdx(idx + 1)}
      />
    );
  }
  return (
    <CourseCard>
      <Pill>{c.tag}</Pill>
      <h2>How this typically unfolds</h2>
      <p>{c.wrapup}</p>
      <NavButtons isFirst={isFirst} onBack={onBack} label="Continue the course" onNext={onNext} />
    </CourseCard>
  );
}

function Timeline({ mod, isFirst, onBack, onNext, nextLabel }: ViewProps & { mod: Of<"timeline"> }) {
  return (
    <CourseCard>
      <Eyebrow>{mod.title}</Eyebrow>
      <h1>{mod.heading}</h1>
      <ol className="relative my-[22px] space-y-5 pl-[26px] before:absolute before:inset-y-1 before:left-1.5 before:w-0.5 before:bg-border">
        {mod.steps.map((s, i) => (
          <li
            key={i}
            className="relative before:absolute before:top-1 before:-left-[26px] before:size-3.5 before:rounded-full before:border-2 before:border-card before:bg-brand before:ring-2 before:ring-brand"
          >
            <h3 className="mb-1 text-[14.5px]">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
      {mod.callout && <ScenarioBox>{mod.callout}</ScenarioBox>}
      {mod.extra}
      <NavButtons isFirst={isFirst} onBack={onBack} label={nextLabel ?? "Continue"} onNext={onNext} />
    </CourseCard>
  );
}

function Checklist({ mod, isFirst, onBack, onNext, nextLabel }: ViewProps & { mod: Of<"checklist"> }) {
  return (
    <CourseCard>
      <Eyebrow>{mod.title}</Eyebrow>
      <h1>{mod.heading}</h1>
      <div className="my-[18px] grid gap-[18px] sm:grid-cols-2">
        <div className="rounded-[10px] bg-success-soft px-5 py-[18px]">
          <h3 className="text-[15px]">Do</h3>
          <PlainList items={mod.dos} />
        </div>
        <div className="rounded-[10px] bg-danger-soft px-5 py-[18px]">
          <h3 className="text-[15px]">Don&apos;t</h3>
          <PlainList items={mod.donts} />
        </div>
      </div>
      <NavButtons isFirst={isFirst} onBack={onBack} label={nextLabel ?? "Continue"} onNext={onNext} />
    </CourseCard>
  );
}

function shuffledOrders(questions: { options: string[] }[]) {
  return questions.map((q) => {
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  });
}

function Exam({ slug, mod, isFirst, passThreshold, onBack, onNext }: ViewProps & { mod: Of<"exam"> }) {
  const total = mod.questions.length;
  const [attempt, setAttempt] = useState(0);
  // Shuffled after mount (not during render) so server and client markup match.
  const [orders, setOrders] = useState<number[][] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [phase, setPhase] = useState<"answering" | "submitting" | "result" | "error">("answering");
  const [result, setResult] = useState<ExamOutcome | null>(null);
  const [error, setError] = useState("");

  useEffect(() => setOrders(shuffledOrders(mod.questions)), [mod.questions, attempt]);

  const picked = answers[idx] ?? null;
  const passPct = Math.round(passThreshold * 100);

  function pick(original: number) {
    setAnswers((a) => {
      const next = [...a];
      next[idx] = original;
      return next;
    });
  }

  async function submit() {
    setPhase("submitting");
    try {
      setResult(await submitExam(slug, answers));
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setPhase("error");
    }
  }

  function retake() {
    setAttempt((n) => n + 1);
    setIdx(0);
    setAnswers([]);
    setResult(null);
    setPhase("answering");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (phase === "submitting" || !orders) {
    return (
      <CourseCard className="text-center">
        <p className="text-muted-foreground">{phase === "submitting" ? "Submitting your assessment…" : "Preparing your assessment…"}</p>
      </CourseCard>
    );
  }
  if (phase === "error") {
    return (
      <CourseCard className="text-center">
        <p className="text-muted-foreground">Could not submit: {error}</p>
        <Button variant="brand" size="cta" onClick={retake}>
          Try again
        </Button>
      </CourseCard>
    );
  }
  if (phase === "result" && result) {
    const pass = result.passed;
    return (
      <CourseCard className="text-center">
        <Eyebrow center>Final Assessment — Official Score</Eyebrow>
        <div className="font-heading text-5xl text-primary sm:text-[52px]">{result.score}%</div>
        <p>
          {result.correctCount} out of {result.total} correct · <span className="whitespace-nowrap">graded server-side</span>
        </p>
        <div className="mx-auto my-4 max-w-[420px] text-left">
          <Feedback correct={pass}>
            {pass
              ? "You've passed — nicely done. Review your answers below, then continue to the policy acknowledgement."
              : `You need ${passPct}% to pass. Revisit any module from the corridor, then retake the assessment — the questions will be in a new order.`}
          </Feedback>
        </div>
        {pass && result.review && <ExamReview questions={mod.questions} answers={answers} correct={result.review} />}
        {/* One clear next step: retake after a fail, continue after a pass. */}
        <div className="mt-7 flex justify-center">
          {pass ? (
            <Button variant="brand" size="cta" onClick={onNext} className="max-sm:w-full" data-next>
              Continue
            </Button>
          ) : (
            <Button variant="brand" size="cta" onClick={retake} className="max-sm:w-full" data-retake>
              Retake assessment
            </Button>
          )}
        </div>
      </CourseCard>
    );
  }

  const item = mod.questions[idx];
  return (
    <CourseCard>
      <Eyebrow>Final Assessment</Eyebrow>
      <QCount>
        Question {idx + 1} of {total} · pass mark {passPct}% ({Math.ceil(total * passThreshold)}/{total})
      </QCount>
      <h2 className="text-lg sm:text-xl">{item.q}</h2>
      {/* No right/wrong feedback until the whole assessment is submitted. */}
      <div className="my-[18px] flex flex-col gap-2.5" role="radiogroup" aria-label={item.q}>
        {orders[idx].map((original) => (
          <button
            key={original}
            data-option
            role="radio"
            aria-checked={picked === original}
            className={cn(optionBase, picked === original && "border-primary bg-brand-soft")}
            onClick={() => pick(original)}
          >
            {item.options[original]}
          </button>
        ))}
      </div>
      <NavButtons
        isFirst={isFirst && idx === 0}
        onBack={idx > 0 ? () => setIdx(idx - 1) : onBack}
        label={idx === total - 1 ? "Submit assessment" : "Next question"}
        onNext={idx < total - 1 ? () => setIdx(idx + 1) : () => void submit()}
        disabled={picked === null}
      />
    </CourseCard>
  );
}

function ExamReview({ questions, answers, correct }: { questions: { q: string; options: string[] }[]; answers: number[]; correct: number[] }) {
  return (
    <details className="mx-auto max-w-[560px] rounded-[10px] border text-left">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-primary">Review your answers</summary>
      <ol className="space-y-3 border-t px-4 py-4 text-sm">
        {questions.map((q, i) => {
          const ok = answers[i] === correct[i];
          return (
            <li key={i}>
              <div className="font-medium">
                {i + 1}. {q.q}
              </div>
              <div className={cn("mt-1", ok ? "text-success-ink" : "text-danger-ink")}>
                {ok ? "✓" : "✗"} Your answer: {q.options[answers[i]]}
              </div>
              {!ok && <div className="text-success-ink">✓ Correct: {q.options[correct[i]]}</div>}
            </li>
          );
        })}
      </ol>
    </details>
  );
}

function Acknowledgement({ slug, mod, isFirst, onBack, onNext }: ViewProps & { mod: Of<"acknowledgement"> }) {
  const [checked, setChecked] = useState<boolean[]>(() => mod.statements.map(() => false));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const all = checked.every(Boolean);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await acknowledgePolicy(slug);
      onNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record your acknowledgement");
      setBusy(false);
    }
  }

  return (
    <CourseCard>
      <Eyebrow>{mod.title}</Eyebrow>
      <h1>{mod.heading}</h1>
      {mod.intro}
      <div className="my-5 flex flex-col gap-2.5">
        {mod.statements.map((st, i) => (
          <label
            key={i}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-[10px] border-[1.5px] bg-card px-4 py-3.5 text-[14.5px] leading-snug transition-colors hover:border-primary",
              checked[i] && "border-primary bg-brand-soft",
            )}
          >
            <input
              type="checkbox"
              data-option
              className="mt-0.5 size-4 shrink-0 accent-primary"
              checked={checked[i]}
              onChange={(e) => setChecked((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
            />
            <span>{st}</span>
          </label>
        ))}
      </div>
      {error && <Feedback correct={false}>{error}</Feedback>}
      <NavButtons isFirst={isFirst} onBack={onBack} label={busy ? "Recording…" : mod.confirmLabel} onNext={confirm} disabled={!all || busy} />
    </CourseCard>
  );
}

function Certificate({ slug, onBack, onMarkComplete }: ViewProps) {
  const [t, setT] = useState<Transcript | { error: string } | null>(null);

  useEffect(() => {
    getTranscript(slug)
      .then(setT)
      .catch((e) => setT({ error: e instanceof Error ? e.message : "Request failed" }));
    onMarkComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!t || "error" in t) {
    return (
      <CourseCard>
        <p className="text-muted-foreground">{t ? t.error : "Loading your transcript…"}</p>
      </CourseCard>
    );
  }
  const verifyUrl = `${window.location.origin}/verify/${t.certCode}`;
  return (
    <CourseCard>
      <div className="rounded-md border-[3px] border-double border-brand bg-linear-to-b from-white to-[#f3f6fd] px-4 py-8 text-center sm:px-10 sm:py-[50px]">
        <Eyebrow center>Official Transcript &amp; Certificate</Eyebrow>
        <h1 className="mb-1 text-2xl sm:text-[32px]">{t.title}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{t.course}</p>
        <p className="mt-[22px]">This certifies that</p>
        <div className="mt-4 mb-1.5 inline-block border-b-2 border-brand pb-1.5 font-heading text-2xl text-primary sm:text-[28px]">
          {t.name}
        </div>
        <p className="mt-2.5">
          <span className="break-all">({t.email})</span> has successfully completed the training with a score of{" "}
          <strong>{t.score}%</strong>
        </p>
        <p className="mt-6 font-mono text-xs text-muted-foreground">
          Issued{" "}
          {new Date(t.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} ·
          Certificate code <strong>{t.certCode}</strong>
          {t.expiresAt && (
            <>
              {" "}
              · Valid until{" "}
              {new Date(t.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </>
          )}
        </p>
        <p className="font-mono text-[11px] break-all text-muted-foreground">
          Verify at{" "}
          <a href={verifyUrl} target="_blank" rel="noreferrer" className="underline">
            {verifyUrl}
          </a>
        </p>
      </div>
      <div className="mt-7 flex items-center justify-between gap-3 print:hidden">
        <Button variant="ghost-link" size="cta" onClick={onBack} className="px-2 sm:px-4">
          ← Back
        </Button>
        <Button variant="brand" size="cta" onClick={() => window.print()} className="max-sm:flex-1">
          Print / Save certificate
        </Button>
      </div>
    </CourseCard>
  );
}
