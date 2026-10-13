"use client";

import { Bold, Braces, Italic, Link2, List, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { resetTemplateAction, saveTemplateAction, type ActionResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emailDocument,
  FIELDS,
  renderMessage,
  SAMPLE_VALUES,
  slackPreviewHtml,
  TEMPLATES,
  unknownFields,
  type MessageTemplate,
  type TemplateKey,
} from "@/lib/notifications/templates";
import { cn } from "@/lib/utils";

type Initial = Record<TemplateKey, { template: MessageTemplate; customised: boolean }>;
type FieldName = "subject" | "body" | "cta";

const GROUPS = [...new Set(FIELDS.map((f) => f.group))];

export function TemplateEditor({ initial }: { initial: Initial }) {
  const [saved, setSaved] = useState(initial);
  const [key, setKey] = useState<TemplateKey>(TEMPLATES[0].key);
  const [draft, setDraft] = useState<MessageTemplate>(initial[TEMPLATES[0].key].template);
  const [preview, setPreview] = useState<"email" | "slack">("email");
  const [result, setResult] = useState<ActionResult>(null);
  const [pending, start] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocused = useRef<FieldName>("body");

  const meta = TEMPLATES.find((t) => t.key === key)!;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved[key].template);
  const unknown = unknownFields(draft.subject, draft.body, draft.cta);
  const rendered = useMemo(() => renderMessage(draft, SAMPLE_VALUES), [draft]);
  const url = SAMPLE_VALUES.course_link!;

  function select(next: TemplateKey) {
    if (next === key) return;
    if (dirty && !confirm("Discard unsaved changes to this template?")) return;
    setKey(next);
    setDraft(saved[next].template);
    setResult(null);
  }

  /** Insert text at the cursor of the last-focused field (wrapping the selection if given). */
  function insert(before: string, after = "", placeholder = "") {
    const field = lastFocused.current === "subject" ? "subject" : "body";
    const el = field === "subject" ? subjectRef.current : bodyRef.current;
    const value = draft[field];
    const startPos = el?.selectionStart ?? value.length;
    const endPos = el?.selectionEnd ?? value.length;
    const selected = value.slice(startPos, endPos) || placeholder;
    const next = value.slice(0, startPos) + before + selected + after + value.slice(endPos);
    setDraft((d) => ({ ...d, [field]: next }));
    requestAnimationFrame(() => {
      el?.focus();
      const caret = startPos + before.length + selected.length + after.length;
      el?.setSelectionRange(caret, caret);
    });
  }

  function insertList() {
    lastFocused.current = "body";
    const el = bodyRef.current;
    const pos = el?.selectionStart ?? draft.body.length;
    const atLineStart = pos === 0 || draft.body[pos - 1] === "\n";
    insert(atLineStart ? "- " : "\n- ", "", "item");
  }

  function save() {
    start(async () => {
      const r = await saveTemplateAction(key, draft);
      setResult(r);
      if (r?.ok) setSaved((s) => ({ ...s, [key]: { template: draft, customised: true } }));
    });
  }

  function reset() {
    if (!confirm("Reset this template to the default text?")) return;
    start(async () => {
      const r = await resetTemplateAction(key);
      setResult(r);
      if (r?.ok) {
        setSaved((s) => ({ ...s, [key]: { template: meta.defaults, customised: false } }));
        setDraft(meta.defaults);
      }
    });
  }

  return (
    <div className="grid gap-5">
      {/* Template picker */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Templates">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === key}
            onClick={() => select(t.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors hover:border-primary",
              t.key === key && "border-primary bg-brand-soft font-semibold",
            )}
          >
            {t.label}
            {saved[t.key].customised && <span className="ml-1.5 text-[11px] text-muted-foreground">(edited)</span>}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">{meta.when}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="grid content-start gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="tpl-subject" className="text-[13px]">
              Subject <span className="font-normal text-muted-foreground">(email subject & Slack heading)</span>
            </Label>
            <Input
              id="tpl-subject"
              ref={subjectRef}
              value={draft.subject}
              onFocus={() => (lastFocused.current = "subject")}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tpl-body" className="text-[13px]">
              Message <span className="font-normal text-muted-foreground">(Markdown)</span>
            </Label>
            <div className="rounded-lg border focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
              <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted px-1.5 py-1">
                <ToolButton label="Bold" onClick={() => ((lastFocused.current = "body"), insert("**", "**", "bold text"))}>
                  <Bold />
                </ToolButton>
                <ToolButton label="Italic" onClick={() => ((lastFocused.current = "body"), insert("_", "_", "italic text"))}>
                  <Italic />
                </ToolButton>
                <ToolButton label="Link" onClick={() => ((lastFocused.current = "body"), insert("[", "]({{course_link}})", "link text"))}>
                  <Link2 />
                </ToolButton>
                <ToolButton label="Bulleted list" onClick={insertList}>
                  <List />
                </ToolButton>
                <span className="mx-1 h-5 w-px bg-border" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="gap-1.5">
                      <Braces /> Insert field
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
                    {GROUPS.map((g, gi) => (
                      <DropdownMenuGroup key={g}>
                        {gi > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className="text-xs text-muted-foreground">{g}</DropdownMenuLabel>
                        {FIELDS.filter((f) => f.group === g).map((f) => (
                          <DropdownMenuItem key={f.key} onSelect={() => insert(`{{${f.key}}}`)} className="flex-col items-start gap-0">
                            <span>{f.label}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {`{{${f.key}}}`} · e.g. {f.example}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <textarea
                id="tpl-body"
                ref={bodyRef}
                value={draft.body}
                onFocus={() => (lastFocused.current = "body")}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={9}
                className="block w-full resize-y rounded-b-lg bg-card px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              **bold**, _italic_, [link](url), “- ” for bullets. Fields insert at the cursor, in the subject or the message.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tpl-cta" className="text-[13px]">
              Button label <span className="font-normal text-muted-foreground">(links to the course)</span>
            </Label>
            <Input id="tpl-cta" value={draft.cta} maxLength={40} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} className="max-w-64" />
          </div>

          {unknown.length > 0 && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-ink">
              Unknown field{unknown.length > 1 ? "s" : ""}: {unknown.map((u) => `{{${u}}}`).join(", ")}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg" onClick={save} disabled={pending || !dirty || unknown.length > 0}>
              {pending ? "Saving…" : "Save template"}
            </Button>
            {dirty && (
              <Button variant="ghost" size="lg" onClick={() => setDraft(saved[key].template)} disabled={pending}>
                Discard changes
              </Button>
            )}
            {saved[key].customised && (
              <Button variant="ghost" size="lg" onClick={reset} disabled={pending} className="text-muted-foreground">
                <RotateCcw /> Reset to default
              </Button>
            )}
          </div>
          {result && (
            <p role="status" className={cn("rounded-lg px-3 py-2 text-sm", result.ok ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink")}>
              {result.message}
            </p>
          )}
        </div>

        {/* Preview */}
        <div className="grid content-start gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold">Preview</span>
            <div className="flex rounded-lg border p-0.5 text-sm" role="tablist" aria-label="Preview channel">
              {(["email", "slack"] as const).map((p) => (
                <button
                  key={p}
                  role="tab"
                  aria-selected={preview === p}
                  onClick={() => setPreview(p)}
                  className={cn("rounded-md px-3 py-1", preview === p ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {p === "email" ? "Email" : "Slack"}
                </button>
              ))}
            </div>
          </div>

          {preview === "email" ? (
            <div className="overflow-hidden rounded-lg border">
              <div className="border-b bg-muted px-3 py-2 text-xs">
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-semibold">{rendered.subject}</span>
              </div>
              {/* Sandboxed: no scripts, isolated styles. */}
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={emailDocument(rendered.emailHtml, rendered.cta, url)}
                className="h-[420px] w-full bg-[#f4f6fb]"
              />
            </div>
          ) : (
            <div className="rounded-lg border bg-white p-4 font-[Lato,Helvetica,Arial,sans-serif] text-[15px] text-[#1d1c1d]">
              <div className="flex gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-navy text-xs font-bold text-white">SL</div>
                <div className="min-w-0 grid gap-1.5">
                  <div>
                    <span className="font-bold">Scaler Learning</span>{" "}
                    <span className="rounded bg-[#e8e8e8] px-1 text-[10px] font-semibold text-[#616061]">APP</span>
                  </div>
                  <div className="text-[17px] font-bold">{rendered.subject.slice(0, 150)}</div>
                  <div
                    className="leading-relaxed break-words [&_a]:text-[#1264a3] [&_a]:underline [&_code]:rounded [&_code]:bg-[#f2f2f2] [&_code]:px-1 [&_.quote]:block [&_.quote]:border-l-4 [&_.quote]:border-[#ddd] [&_.quote]:pl-2"
                    // Safe: built from Slack-escaped mrkdwn by slackPreviewHtml.
                    dangerouslySetInnerHTML={{ __html: slackPreviewHtml(rendered.slackMrkdwn) }}
                  />
                  <span className="mt-1 inline-flex w-fit rounded border border-[#007a5a] bg-[#007a5a] px-3 py-1 text-sm font-bold text-white">
                    {rendered.cta}
                  </span>
                </div>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Preview uses sample data. The same message goes out on every available channel. At escalation steps the manager is
            CC&apos;d on email (with a line saying so); Slack has no CC, so it goes to the learner only.
          </p>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      // Keep focus (and the selection) in the field being edited.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
