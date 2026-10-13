"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import {
  saveNotificationsAction,
  testHrmsAction,
  testNotificationAction,
  type ActionResult,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NotificationMode, SettingsShape } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* -------------------------------- shared -------------------------------- */

export function Section({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border bg-card px-4 py-6 sm:px-8 sm:py-7">
      <h2 className="mb-1 text-xl">{title}</h2>
      <p className="mb-5 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label className="text-[13px]">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Result({ r }: { r: ActionResult }) {
  if (!r) return null;
  return (
    <p role="status" className={cn("rounded-lg px-3 py-2 text-sm", r.ok ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink")}>
      {r.message}
    </p>
  );
}

function Actions({ pending, test }: { pending: boolean; test?: { label: string; run: () => Promise<ActionResult> } }) {
  const [testResult, setTestResult] = useState<ActionResult>(null);
  const [testing, startTest] = useTransition();
  return (
    <div className="mt-5 grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {test && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={testing}
            onClick={() => startTest(async () => setTestResult(await test.run()))}
          >
            {testing ? "Testing…" : test.label}
          </Button>
        )}
      </div>
      <Result r={testResult} />
    </div>
  );
}

/* --------------------------------- forms -------------------------------- */

const MODES: { value: NotificationMode; label: string; help: string }[] = [
  { value: "off", label: "Off", help: "No nudges are generated." },
  { value: "dry_run", label: "Dry run", help: "Nudges are generated and logged (see Automation) but not sent. Use this to review before going live." },
  { value: "live", label: "Live", help: "Nudges are sent on the enabled channels." },
];

export function NotificationsForm({ mode }: { mode: NotificationMode }) {
  const [state, action, pending] = useActionState(saveNotificationsAction, null);
  return (
    <form action={action}>
      <fieldset className="grid gap-2.5">
        {MODES.map((m) => (
          <label key={m.value} className="flex cursor-pointer gap-3 rounded-lg border p-3 has-checked:border-primary has-checked:bg-brand-soft">
            <input type="radio" name="mode" value={m.value} defaultChecked={mode === m.value} className="mt-1 accent-primary" />
            <span>
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.help}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Actions pending={pending} />
      <div className="mt-3">
        <Result r={state} />
      </div>
    </form>
  );
}

/** Read-only status for an env-configured integration, with an optional test button. */
export function ChannelStatus({
  name,
  configured,
  detail,
  envHint,
  testLabel,
  test,
}: {
  name: string;
  configured: boolean;
  detail: string;
  envHint: ReactNode;
  testLabel?: string;
  test?: () => Promise<ActionResult>;
}) {
  const [result, setResult] = useState<ActionResult>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-3 rounded-[10px] border bg-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{name}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs", configured ? "bg-success-soft text-success-ink" : "bg-muted-foreground/10 text-muted-foreground")}>
          {configured ? "Configured" : "Not configured"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{configured ? detail : envHint}</p>
      {configured && test && (
        <Button variant="outline" size="lg" className="justify-self-start" disabled={pending} onClick={() => start(async () => setResult(await test()))}>
          {pending ? "Testing…" : testLabel}
        </Button>
      )}
      <Result r={result} />
    </div>
  );
}

/** One test for the whole notification pipeline (all configured providers). */
export function TestNotificationButton({ disabled }: { disabled: boolean }) {
  const [result, setResult] = useState<ActionResult>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="lg"
          disabled={pending || disabled}
          onClick={() => start(async () => setResult(await testNotificationAction()))}
        >
          {pending ? "Sending…" : "Send test notification to me"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {disabled
            ? "Configure at least one provider to send a test."
            : "Uses the “Course assigned” template and goes out on every configured provider, even in Dry run."}
        </span>
      </div>
      <Result r={result} />
    </div>
  );
}

export function HrmsStatus({ connection }: { connection: { label: string; configured: boolean } }) {
  return (
    <div className="grid gap-3">
      <ChannelStatus
        name={connection.label}
        configured={connection.configured}
        detail="Synced daily. Which employees get which course is set per course under Admin → Courses."
        envHint={
          <>
            Set <code>DARWINBOX_BASE_URL</code>, <code>DARWINBOX_USERNAME</code>, <code>DARWINBOX_PASSWORD</code>,{" "}
            <code>DARWINBOX_API_KEY</code> and <code>DARWINBOX_DATASET_KEY</code> on the server (or <code>HRMS_PROVIDER=mock</code> for local testing).
          </>
        }
        testLabel="Test connection"
        test={testHrmsAction}
      />
    </div>
  );
}
