import type { ReactNode } from "react";
import { ORG } from "@/content/org";

// Company-specific blocks for course content, filled from content/org.ts.

export function PolicyLink() {
  return (
    <a href={ORG.poshPolicyUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">
      Read the company POSH policy
    </a>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b py-3.5 last:border-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase sm:pt-0.5">{label}</dt>
      <dd className="text-[14.5px] leading-relaxed">{children}</dd>
    </div>
  );
}

/** Where and how to report at this company. */
export function ReportingContacts() {
  const ic = ORG.internalCommittee;
  return (
    <dl className="my-5 rounded-[10px] border bg-muted px-4 sm:px-5">
      <Row label="How to report">
        Email the Internal Committee at{" "}
        <a className="font-semibold break-all text-primary underline" href={`mailto:${ic.email}`}>
          {ic.email}
        </a>
      </Row>
      <Row label="Internal Committee">
        <ul className="space-y-2">
          {ic.members.map((m) => (
            <li key={m.name}>
              <strong>{m.name}</strong> <span className="text-muted-foreground">· {m.role}</span>
              <span className="block text-sm text-muted-foreground">{m.designation}</span>
            </li>
          ))}
        </ul>
      </Row>
      <Row label="Company policy">
        <PolicyLink />
      </Row>
      <Row label="Against the employer">
        Complaints against the employer itself go to the <strong>Local Committee</strong> set up by the District Officer.
      </Row>
    </dl>
  );
}
