import { describe, expect, it } from "vitest";
import { HRMS_FIELDS } from "@/lib/hrms-fields";
import { FIELDS, markdownToPlainText, markdownToSlack, renderMessage, sampleValues, TEMPLATES, unknownFields } from "./templates";

describe("markdown → Slack mrkdwn", () => {
  it("converts emphasis, links and lists", () => {
    expect(markdownToSlack("Hi **Priya**, see [the course](https://x.test/c) _soon_.")).toBe(
      "Hi *Priya*, see <https://x.test/c|the course> _soon_.",
    );
    expect(markdownToSlack("Steps:\n\n- one\n- **two**")).toBe("Steps:\n\n• one\n• *two*");
  });
  it("escapes Slack control characters", () => {
    expect(markdownToSlack("a < b & c")).toBe("a &lt; b &amp; c");
  });
});

describe("markdown → plain text", () => {
  it("drops formatting and spells out links", () => {
    expect(markdownToPlainText("Hi **A** _b_ [go](https://x.test)\n\n- one\n- two")).toBe("Hi A b go (https://x.test)\n\n- one\n- two");
  });
});

describe("renderMessage", () => {
  const t = { subject: "Hi {{full_name}}", body: "Hello **{{full_name}}** — [go]({{course_link}})", cta: "Open" };

  it("fills fields in subject, email and Slack", () => {
    const r = renderMessage(t, { full_name: "Priya Sharma", course_link: "https://x.test/c" });
    expect(r.subject).toBe("Hi Priya Sharma");
    expect(r.emailHtml).toContain("<strong>Priya Sharma</strong>");
    expect(r.emailHtml).toContain('href="https://x.test/c"');
    expect(r.slackMrkdwn).toBe("Hello *Priya Sharma* — <https://x.test/c|go>");
  });

  it("treats field values as literal text (no markup injection)", () => {
    const r = renderMessage(t, { full_name: "<img src=x onerror=alert(1)> *bold*", course_link: "https://x.test" });
    expect(r.emailHtml).not.toContain("<img");
    expect(r.emailHtml).toContain("&lt;img");
    expect(r.slackMrkdwn).toContain("&lt;img");
    // Markdown in a value is shown literally, not as formatting.
    expect(r.emailHtml).not.toContain("<em>bold</em>");
  });

  it("escapes raw HTML written in a template", () => {
    expect(renderMessage({ ...t, body: "<script>x</script> hi" }, {}).emailHtml).not.toContain("<script>");
  });

  it("appends the note", () => {
    expect(renderMessage(t, {}, { note: "Your manager has been copied." }).slackMrkdwn).toMatch(/_Your manager has been copied\._$/);
  });
});

describe("default templates", () => {
  it("only use known fields", () => {
    for (const tpl of TEMPLATES) expect(unknownFields(tpl.defaults.subject, tpl.defaults.body, tpl.defaults.cta)).toEqual([]);
  });
  it("render with sample data without leftover placeholders", () => {
    for (const tpl of TEMPLATES) {
      const r = renderMessage(tpl.defaults, sampleValues("https://lms.example.test/courses/posh-pocso"));
      expect(r.subject + r.slackMrkdwn + r.emailHtml).not.toMatch(/\{\{/);
    }
  });
  it("sample values use the course link passed in", () => {
    expect(sampleValues("https://lms.example.test/courses/x").course_link).toBe("https://lms.example.test/courses/x");
  });
  it("flags unknown fields, including derived ones not in the HRMS mapping", () => {
    expect(unknownFields("Hi {{full_name}} {{nickname}} {{manager_first_name}}")).toEqual(["nickname", "manager_first_name"]);
  });
  it("offers exactly the mapped HRMS fields", () => {
    const hrms = FIELDS.filter((f) => f.group === "Employee (HRMS)").map((f) => f.key);
    expect(hrms).toEqual(HRMS_FIELDS.map((f) => f.placeholder));
  });
});
