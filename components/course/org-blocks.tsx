import type { ReactNode } from "react";
import { ORG } from "@/content/org";

// Company-specific blocks for course content, filled from content/org.ts.

export function Placeholder({ children = "To be added by HR" }: { children?: ReactNode }) {
  return (
    <span className="inline-block rounded border border-dashed border-brand/60 bg-brand-soft/60 px-1.5 py-0.5 text-[13px] text-secondary-foreground italic">
      {children}
    </span>
  );
}

/** Company policy coverage line, for content that describes who POSH protects. */
export function PolicyCoverage() {
  return (
    <span className="mt-2 block">
      <strong className="text-foreground">Our policy: </strong>
      {ORG.policyCoverage ?? <Placeholder>Who the company policy covers — to be added by HR</Placeholder>}
    </span>
  );
}

export function PolicyLink() {
  return ORG.poshPolicyUrl ? (
    <a href={ORG.poshPolicyUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">
      Read the company POSH policy
    </a>
  ) : (
    <Placeholder>Link to the company POSH policy — to be added by HR</Placeholder>
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
      <Row label="Internal Committee">
        {ic.members.length ? (
          <ul className="space-y-1.5">
            {ic.members.map((m) => (
              <li key={m.name}>
                <strong>{m.name}</strong> <span className="text-muted-foreground">· {m.role}</span>
                {(m.email || m.phone) && (
                  <span className="block text-sm break-all text-muted-foreground">
                    {[m.email, m.phone].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Placeholder>IC members (Presiding Officer, members, external member) — to be added by HR</Placeholder>
        )}
      </Row>
      <Row label="How to file">
        {ic.email || ic.formUrl ? (
          <span className="flex flex-col gap-1">
            {ic.email && (
              <span>
                Email{" "}
                <a className="font-semibold break-all text-primary underline" href={`mailto:${ic.email}`}>
                  {ic.email}
                </a>
              </span>
            )}
            {ic.formUrl && (
              <a className="font-semibold text-primary underline" href={ic.formUrl} target="_blank" rel="noreferrer">
                Online complaint form
              </a>
            )}
          </span>
        ) : (
          <Placeholder>IC email / complaint form — to be added by HR</Placeholder>
        )}
      </Row>
      <Row label="Company policy">
        <PolicyLink />
      </Row>
      <Row label="Appeals">
        {ORG.appellateAuthority ?? <Placeholder>Appellate authority — to be added by HR</Placeholder>}
      </Row>
      <Row label="Against the employer">
        Complaints against the employer itself go to the district <strong>Local Committee</strong>.{" "}
        {ORG.localCommittee ? (
          <span className="block text-sm text-muted-foreground">
            {ORG.localCommittee.district}: {ORG.localCommittee.contact}
          </span>
        ) : (
          <Placeholder>Local Committee contact — to be added by HR</Placeholder>
        )}
      </Row>
      <Row label="Support">
        {ORG.counselling ?? <Placeholder>Counselling / EAP details — to be added by HR</Placeholder>}
      </Row>
    </dl>
  );
}
