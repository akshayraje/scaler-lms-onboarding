"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { saveCourseSettingsAction, type ActionResult } from "@/app/actions/admin";
import { MultiSelectCombobox } from "@/components/admin/MultiSelectCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  describeStep,
  FILTER_FIELDS,
  MAX_STEPS,
  validateCourseSettings,
  type CourseSettings,
  type CoverageRule,
  type EmployeeFilterField,
  type NudgeStep,
} from "@/lib/course-settings";
import { cn } from "@/lib/utils";

function Card({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card px-4 py-6 sm:px-8 sm:py-7">
      <h3 className="mb-1 text-lg">{title}</h3>
      <p className="mb-5 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

/** Number input that tolerates an empty/partial value while typing. */
function NumberField({ value, onChange, min, max, className, label }: { value: number; onChange: (n: number) => void; min: number; max: number; className?: string; label: string }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      aria-label={label}
      min={min}
      max={max}
      value={Number.isNaN(value) ? "" : value}
      onChange={(e) => onChange(e.target.value === "" ? NaN : Math.trunc(Number(e.target.value)))}
      className={cn("w-24", className)}
    />
  );
}

function RuleRow({
  rule,
  options,
  onChange,
  onRemove,
}: {
  rule: CoverageRule;
  options: { value: string; count: number }[];
  onChange: (r: CoverageRule) => void;
  onRemove: () => void;
}) {
  const remove = (
    <Button type="button" variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground hover:text-danger" aria-label="Remove rule" onClick={onRemove}>
      <Trash2 />
    </Button>
  );

  if (rule.type === "joined_within") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-muted px-3 py-2.5 text-sm">
        <span className="font-semibold">Joining date</span>
        <span>joined in the last</span>
        <NumberField label="Joined within days" value={rule.days} min={1} max={365} onChange={(days) => onChange({ ...rule, days })} />
        <span>days</span>
        {remove}
      </div>
    );
  }

  const label = FILTER_FIELDS.find((f) => f.field === rule.field)!.label;
  return (
    <div className="grid gap-2 rounded-lg border bg-muted px-3 py-2.5 text-sm">
      <div className="flex items-center gap-3">
        <span className="font-semibold">{label}</span>
        <span>is any of</span>
        {remove}
      </div>
      <MultiSelectCombobox
        options={options}
        selected={rule.values}
        noun={label.toLowerCase()}
        onChange={(values) => onChange({ ...rule, values })}
      />
    </div>
  );
}

function StepsEditor({
  kind,
  steps,
  onChange,
}: {
  kind: "assignment" | "renewal";
  steps: NudgeStep[];
  onChange: (s: NudgeStep[]) => void;
}) {
  const update = (i: number, patch: Partial<NudgeStep>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const add = () => {
    const last = steps.at(-1)?.day ?? (kind === "renewal" ? -7 : -1);
    onChange([...steps, { day: last + 7, ccManager: steps.at(-1)?.ccManager ?? false }]);
  };
  return (
    <div className="grid gap-2">
      {steps.length === 0 && <p className="text-sm text-muted-foreground">No nudges.</p>}
      {steps.map((s, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted px-3 py-2.5">
          <span className="w-14 font-mono text-xs text-muted-foreground">Step {i + 1}</span>
          <label className="flex items-center gap-2 text-sm">
            {kind === "assignment" ? "Day" : "Day (from expiry)"}
            <NumberField
              label={`Step ${i + 1} day`}
              value={s.day}
              min={kind === "assignment" ? 0 : -60}
              max={365}
              onChange={(day) => update(i, { day })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.ccManager} onChange={(e) => update(i, { ccManager: e.target.checked })} className="size-4 accent-primary" />
            CC manager
          </label>
          <span className="text-xs text-muted-foreground">{Number.isNaN(s.day) ? "" : describeStep(s, kind)}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ml-auto text-muted-foreground hover:text-danger"
            aria-label={`Remove step ${i + 1}`}
            onClick={() => onChange(steps.filter((_, j) => j !== i))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="lg" className="justify-self-start" onClick={add} disabled={steps.length >= MAX_STEPS}>
        <Plus /> Add step
      </Button>
    </div>
  );
}

type FieldOptions = Record<EmployeeFilterField, { value: string; count: number }[]>;

export function CourseSettingsEditor({ courseId, initial, fieldOptions }: { courseId: string; initial: CourseSettings; fieldOptions: FieldOptions }) {
  const [saved, setSaved] = useState(initial);
  const [s, setS] = useState(initial);
  const [result, setResult] = useState<ActionResult>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const { errors } = validateCourseSettings(s);
  const cov = s.coverage;
  const setCov = (patch: Partial<CourseSettings["coverage"]>) => setS({ ...s, coverage: { ...cov, ...patch } });

  function save() {
    start(async () => {
      const r = await saveCourseSettingsAction(courseId, s);
      setResult(r);
      if (r?.ok) {
        // Server sorts steps by day; mirror that so the form isn't left "dirty".
        const normalised = validateCourseSettings(s).value ?? s;
        setS(normalised);
        setSaved(normalised);
      }
    });
  }

  return (
    <div className="grid gap-6">
      <Card
        title="Coverage"
        description="Who is automatically assigned this course during the daily HRMS sync. Employees must match all rules."
      >
        <div className="grid gap-5">
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" checked={cov.enabled} onChange={(e) => setCov({ enabled: e.target.checked })} className="size-4 accent-primary" />
            Assign automatically from the HRMS
          </label>

          <fieldset disabled={!cov.enabled} className="grid gap-5 disabled:opacity-50">
            <div className="grid gap-2">
              <Label className="text-[13px]">Rules — employees must match every rule; within a rule, any selected value matches</Label>
              {cov.rules.length === 0 && <p className="text-sm text-muted-foreground">No rules yet.</p>}
              {cov.rules.map((r, i) => (
                <div key={r.id} className="grid gap-1">
                  {i > 0 && <span className="pl-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">and</span>}
                  <RuleRow
                    rule={r}
                    options={r.type === "employee_field" ? fieldOptions[r.field] : []}
                    onChange={(next) => setCov({ rules: cov.rules.map((x, j) => (j === i ? next : x)) })}
                    onRemove={() => setCov({ rules: cov.rules.filter((_, j) => j !== i) })}
                  />
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={cov.rules.some((r) => r.type === "joined_within")}
                  onClick={() => setCov({ rules: [...cov.rules, { id: crypto.randomUUID(), type: "joined_within", days: 30 }] })}
                >
                  <Plus /> Joining date
                </Button>
                {FILTER_FIELDS.map((f) => (
                  <Button
                    key={f.field}
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={cov.rules.some((r) => r.type === "employee_field" && r.field === f.field)}
                    onClick={() => setCov({ rules: [...cov.rules, { id: crypto.randomUUID(), type: "employee_field", field: f.field, values: [] }] })}
                  >
                    <Plus /> {f.label}
                  </Button>
                ))}
              </div>
              {cov.enabled && cov.rules.length > 0 && !cov.rules.some((r) => r.type === "joined_within") && (
                <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-secondary-foreground">
                  Without a joining-date rule, every current employee who matches will be assigned on the next sync — not just new
                  joiners.
                </p>
              )}
            </div>

            <label className="flex flex-wrap items-center gap-2 text-sm">
              Due
              <NumberField label="Due in days" value={cov.dueInDays} min={1} max={365} onChange={(dueInDays) => setCov({ dueInDays })} />
              days after assignment
            </label>
          </fieldset>
        </div>
      </Card>

      <Card title="Certificate" description="How long a certificate stays valid. Applies to certificates issued from now on; existing ones keep their expiry date.">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <label className="flex items-center gap-2.5 font-medium">
            <input
              type="checkbox"
              checked={s.certificate.validityMonths !== null}
              onChange={(e) => setS({ ...s, certificate: { validityMonths: e.target.checked ? 12 : null } })}
              className="size-4 accent-primary"
            />
            Certificates expire
          </label>
          {s.certificate.validityMonths !== null && (
            <label className="flex items-center gap-2">
              after
              <NumberField
                label="Validity in months"
                value={s.certificate.validityMonths}
                min={1}
                max={120}
                onChange={(validityMonths) => setS({ ...s, certificate: { validityMonths } })}
              />
              months
            </label>
          )}
        </div>
      </Card>

      <Card
        title="Nudge schedule"
        description={
          <>
            The first step uses the <em>Course assigned</em> template, later ones <em>Reminder</em>. Only the latest due step is
            sent, and nudges stop once the course is completed. “CC manager” copies the manager on email (Slack has no CC).
          </>
        }
      >
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label className="text-[13px]">After assignment (days)</Label>
            <StepsEditor kind="assignment" steps={s.nudges.assignment} onChange={(assignment) => setS({ ...s, nudges: { ...s.nudges, assignment } })} />
          </div>
          {s.certificate.validityMonths !== null && (
            <div className="grid gap-2">
              <Label className="text-[13px]">Around certificate expiry (negative = before expiry; uses the Certificate renewal template)</Label>
              <StepsEditor kind="renewal" steps={s.nudges.renewal} onChange={(renewal) => setS({ ...s, nudges: { ...s.nudges, renewal } })} />
            </div>
          )}
        </div>
      </Card>

      {errors.length > 0 && dirty && (
        <ul className="list-disc rounded-lg bg-danger-soft py-2 pr-3 pl-7 text-sm text-danger-ink">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={save} disabled={pending || !dirty || errors.length > 0}>
          {pending ? "Saving…" : "Save course settings"}
        </Button>
        {dirty && (
          <Button variant="ghost" size="lg" onClick={() => setS(saved)} disabled={pending}>
            Discard changes
          </Button>
        )}
      </div>
      {result && (
        <p role="status" className={cn("rounded-lg px-3 py-2 text-sm", result.ok ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink")}>
          {result.message}
        </p>
      )}
    </div>
  );
}
