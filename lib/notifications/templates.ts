import { Marked, type Tokens } from "marked";
import { HRMS_FIELDS, type HrmsPlaceholder } from "@/lib/hrms-fields";

// Notification templates: one Markdown source per message, rendered to HTML for
// email and to Slack mrkdwn for Slack. Pure module — used by the server when
// sending and by the admin editor for live previews.

/* -------------------------------- fields -------------------------------- */

/** App-provided fields (not from the HRMS). */
const APP_FIELDS = [
  { key: "course_title", label: "Course title", example: "Respect at Work" },
  { key: "course_link", label: "Course link", example: "https://learn.scaler.com/courses/posh-pocso" },
  { key: "due_date", label: "Due date", example: "20 October 2026" },
  { key: "due_status", label: "Due status (due in 3 days / due today / overdue by 2 days)", example: "due in 3 days" },
  { key: "expiry_date", label: "Certificate expiry date", example: "27 October 2026" },
  { key: "expiry_status", label: "Expiry status (expires in 7 days / expired 3 days ago)", example: "expires in 7 days" },
] as const;

export type FieldKey = HrmsPlaceholder | (typeof APP_FIELDS)[number]["key"];

/** Fields available in templates: exactly the mapped HRMS fields, plus course & timing. */
export const FIELDS: { key: FieldKey; label: string; group: "Employee (HRMS)" | "Course & timing"; example: string }[] = [
  ...HRMS_FIELDS.map((f) => ({ key: f.placeholder, label: f.label, group: "Employee (HRMS)" as const, example: f.example })),
  ...APP_FIELDS.map((f) => ({ ...f, group: "Course & timing" as const })),
];

export type FieldValues = Partial<Record<FieldKey, string>>;
export const SAMPLE_VALUES: FieldValues = Object.fromEntries(FIELDS.map((f) => [f.key, f.example]));

const FIELD_KEYS = new Set<string>(FIELDS.map((f) => f.key));
const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Placeholders used in a template that aren't known fields. */
export function unknownFields(...texts: string[]) {
  const bad = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(PLACEHOLDER)) if (!FIELD_KEYS.has(m[1])) bad.add(m[1]);
  return [...bad];
}

/* ------------------------------ templates ------------------------------- */

export type TemplateKey = "course_assigned" | "reminder" | "renewal";

export type MessageTemplate = { subject: string; body: string; cta: string };

export const TEMPLATES: { key: TemplateKey; label: string; when: string; defaults: MessageTemplate }[] = [
  {
    key: "course_assigned",
    label: "Course assigned",
    when: "First message when a course is assigned to a new joiner.",
    defaults: {
      subject: "Welcome! Please complete {{course_title}} by {{due_date}}",
      body: "Hi {{full_name}} 👋\n\nAs part of joining, please complete the mandatory **{{course_title}}** training by **{{due_date}}**. It's self-paced — you can stop and resume anytime.",
      cta: "Start the course",
    },
  },
  {
    key: "reminder",
    label: "Reminder",
    when: "Every follow-up until the course is completed — before, on and after the due date. Use {{due_status}} for the timing.",
    defaults: {
      subject: "Reminder: {{course_title}} is {{due_status}}",
      body: "Hi {{full_name}}, the mandatory **{{course_title}}** training is **{{due_status}}** (due {{due_date}}). Please complete it as soon as you can.",
      cta: "Continue the course",
    },
  },
  {
    key: "renewal",
    label: "Certificate renewal",
    when: "Before and after a certificate expires. Use {{expiry_status}} for the timing.",
    defaults: {
      subject: "Your {{course_title}} certificate {{expiry_status}}",
      body: "Hi {{full_name}}, your **{{course_title}}** certificate {{expiry_status}} ({{expiry_date}}). Retake the assessment to renew it for another year — it only takes a few minutes if you skip straight to it.",
      cta: "Renew now",
    },
  },
];

export const TEMPLATE_KEYS = new Set<string>(TEMPLATES.map((t) => t.key));

/* ------------------------------ rendering ------------------------------- */

/** Backslash-escape Markdown punctuation so field values render literally. */
const escapeMd = (v: string) => v.replace(/[\\`*_{}[\]()#+\-.!|<>~&]/g, "\\$&");
const URL_FIELDS = new Set<string>(["course_link"]);

/** Fill placeholders. `markdown` = values are escaped for a Markdown context. */
export function fill(text: string, values: FieldValues, markdown: boolean) {
  return text.replace(PLACEHOLDER, (whole, key: string) => {
    if (!FIELD_KEYS.has(key)) return whole;
    const v = values[key as FieldKey] ?? "";
    return markdown && !URL_FIELDS.has(key) ? escapeMd(v) : v;
  });
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const P = 'style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#10141c"';

/** Markdown → email HTML. Raw HTML in templates is escaped, not passed through. */
const emailMarked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html: ({ text }) => escapeHtml(text),
    paragraph({ tokens }) {
      return `<p ${P}>${this.parser.parseInline(tokens)}</p>`;
    },
    heading({ tokens }) {
      return `<p ${P}><strong>${this.parser.parseInline(tokens)}</strong></p>`;
    },
    link({ href, tokens }) {
      return `<a href="${escapeHtml(href)}" style="color:#0043c9">${this.parser.parseInline(tokens)}</a>`;
    },
    list(token) {
      const tag = token.ordered ? "ol" : "ul";
      const items = token.items.map((i) => `<li style="margin:0 0 6px">${this.parser.parse(i.tokens).replace(/^<p [^>]*>|<\/p>$/g, "")}</li>`);
      return `<${tag} style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.6;color:#10141c">${items.join("")}</${tag}>`;
    },
  },
});

export function markdownToEmailHtml(md: string) {
  return emailMarked.parse(md, { async: false }) as string;
}

const escapeSlack = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Markdown → Slack mrkdwn (bold *x*, italic _x_, links <url|text>, bullets). */
const slackMarked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    space: () => "",
    html: ({ text }) => escapeSlack(text),
    text(token: Tokens.Text | Tokens.Escape) {
      return "tokens" in token && token.tokens ? this.parser.parseInline(token.tokens) : escapeSlack(token.text);
    },
    paragraph({ tokens }) {
      return `${this.parser.parseInline(tokens)}\n\n`;
    },
    heading({ tokens }) {
      return `*${this.parser.parseInline(tokens)}*\n\n`;
    },
    strong({ tokens }) {
      return `*${this.parser.parseInline(tokens)}*`;
    },
    em({ tokens }) {
      return `_${this.parser.parseInline(tokens)}_`;
    },
    del({ tokens }) {
      return `~${this.parser.parseInline(tokens)}~`;
    },
    codespan: ({ text }) => `\`${text}\``,
    code: ({ text }) => `\`\`\`${text}\`\`\`\n\n`,
    br: () => "\n",
    hr: () => "──────────\n\n",
    blockquote({ tokens }) {
      return (
        this.parser
          .parse(tokens)
          .trim()
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n") + "\n\n"
      );
    },
    link({ href, tokens }) {
      return `<${href}|${this.parser.parseInline(tokens)}>`;
    },
    image: ({ href, text }) => `<${href}|${escapeSlack(text || href)}>`,
    list(token) {
      const items = token.items.map(
        (it, i) => `${token.ordered ? `${(Number(token.start) || 1) + i}.` : "•"} ${this.parser.parse(it.tokens).trim()}`,
      );
      return items.join("\n") + "\n\n";
    },
    checkbox: ({ checked }) => (checked ? "☑ " : "☐ "),
  },
});

export function markdownToSlack(md: string) {
  return (slackMarked.parse(md, { async: false }) as string).replace(/\n{3,}/g, "\n\n").trim();
}

/** Markdown → plain text (for the text/plain email part): formatting removed, links as "text (url)". */
const plainMarked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    space: () => "",
    html: ({ text }) => text,
    text(token: Tokens.Text | Tokens.Escape) {
      return "tokens" in token && token.tokens ? this.parser.parseInline(token.tokens) : token.text;
    },
    paragraph({ tokens }) {
      return `${this.parser.parseInline(tokens)}\n\n`;
    },
    heading({ tokens }) {
      return `${this.parser.parseInline(tokens)}\n\n`;
    },
    strong({ tokens }) {
      return this.parser.parseInline(tokens);
    },
    em({ tokens }) {
      return this.parser.parseInline(tokens);
    },
    del({ tokens }) {
      return this.parser.parseInline(tokens);
    },
    codespan: ({ text }) => text,
    code: ({ text }) => `${text}\n\n`,
    br: () => "\n",
    hr: () => "----------\n\n",
    blockquote({ tokens }) {
      return this.parser.parse(tokens);
    },
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens);
      return label === href ? href : `${label} (${href})`;
    },
    image: ({ href, text }) => (text ? `${text} (${href})` : href),
    list(token) {
      return (
        token.items.map((it, i) => `${token.ordered ? `${(Number(token.start) || 1) + i}.` : "-"} ${this.parser.parse(it.tokens).trim()}`).join("\n") +
        "\n\n"
      );
    },
    checkbox: ({ checked }) => (checked ? "[x] " : "[ ] "),
  },
});

export function markdownToPlainText(md: string) {
  return (plainMarked.parse(md, { async: false }) as string).replace(/\n{3,}/g, "\n\n").trim();
}

export type RenderedMessage = {
  subject: string;
  markdown: string;
  emailHtml: string; // body only — wrap with emailDocument()
  slackMrkdwn: string;
  plainText: string;
  cta: string;
};

/** Fill a template and render it for every provider. `note` is appended in italics (e.g. "manager copied"). */
export function renderMessage(t: MessageTemplate, values: FieldValues, opts: { note?: string } = {}): RenderedMessage {
  const { note } = opts;
  const markdown = fill(t.body, values, true) + (note ? `\n\n_${escapeMd(note)}_` : "");
  const plainText = markdownToPlainText(markdown);
  return {
    subject: fill(t.subject, values, false).trim(),
    markdown,
    emailHtml: markdownToEmailHtml(markdown),
    slackMrkdwn: markdownToSlack(markdown),
    plainText,
    cta: fill(t.cta, values, false).trim() || "Open",
  };
}

/** Full HTML email around a rendered body, with the call-to-action button. */
export function emailDocument(bodyHtml: string, cta: string, url: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;padding:24px 12px;font-family:Inter,Segoe UI,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e1e5ec;border-radius:14px">
<tr><td style="padding:28px 28px 8px">${bodyHtml}
<a href="${escapeHtml(url)}" style="display:inline-block;background:#4c86ff;color:#061b4d;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:8px">${escapeHtml(cta)}</a>
<p style="margin:20px 0 0;font-size:12px;color:#5b6473">Or open: <a href="${escapeHtml(url)}" style="color:#0043c9">${escapeHtml(url)}</a></p></td></tr>
<tr><td style="padding:16px 28px 24px;font-size:11px;color:#8890a0">Sent by Scaler Learning — internal training notifications.</td></tr>
</table></td></tr></table></body></html>`;
}

/** Approximate HTML rendering of Slack mrkdwn, for the editor preview only. */
export function slackPreviewHtml(mrkdwn: string) {
  // Text is already Slack-escaped (&amp; &lt; &gt;); a raw "<" only starts a link.
  const links: string[] = [];
  let s = mrkdwn.replace(/<([^|>]+)\|([^>]+)>/g, (_, href: string, text: string) => {
    links.push(`<a href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noreferrer">${text}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });
  s = s
    .replace(/```([\s\S]*?)```/g, "<pre>$1</pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, "$1<strong>$2</strong>")
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])~([^~\n]+)~(?=[\s).,!?:;]|$)/g, "$1<del>$2</del>")
    .replace(/^&gt; (.*)$/gm, '<span class="quote">$1</span>')
    .replace(/\n/g, "<br>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => links[Number(i)]);
}
