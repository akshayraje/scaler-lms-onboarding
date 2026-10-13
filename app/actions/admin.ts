"use server";

import { revalidatePath } from "next/cache";
import { COURSES, getCourse } from "@/content/courses";
import { notify } from "@/lib/notifications/notify";
import { availableProviders } from "@/lib/notifications/providers";
import { getTemplates } from "@/lib/notifications/store";
import { validateCourseSettings } from "@/lib/course-settings";
import { saveCourseSettings } from "@/lib/course-settings-store";
import { audit } from "@/lib/audit";
import { fetchHrmsEmployees } from "@/lib/automation/hrms";
import { isJobName, JOBS, runJob } from "@/lib/automation/jobs";
import { summaryText } from "@/lib/automation/summary";
import { saveTemplate } from "@/lib/notifications/store";
import { sampleValues, TEMPLATE_KEYS, unknownFields, type TemplateKey } from "@/lib/notifications/templates";
import { saveSettings, type NotificationMode } from "@/lib/settings";
import { requireAdmin } from "@/lib/session";
import { courseUrl } from "@/lib/urls";

export type ActionResult = { ok: boolean; message: string } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function saved(key: string, email: string) {
  await audit({ email, action: "settings_updated", detail: key });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Saved." };
}

export async function saveNotificationsAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const mode = str(f, "mode") as NotificationMode;
  if (!["off", "dry_run", "live"].includes(mode)) return { ok: false, message: "Invalid mode" };
  await saveSettings("notifications", { mode }, admin.email);
  return saved(`notifications.mode=${mode}`, admin.email);
}

/**
 * Sends a test notification to the signed-in admin through the same pipeline as
 * real nudges (template → every configured provider), and reports per provider.
 * Always delivers, regardless of the Dry run setting — it only goes to you.
 */
export async function testNotificationAction(): Promise<ActionResult> {
  const admin = await requireAdmin();
  const providers = availableProviders();
  if (!providers.length) return { ok: false, message: "No notification providers are configured (set SMTP_* and/or SLACK_BOT_TOKEN)." };

  const course = COURSES[0];
  const url = courseUrl(course.slug);
  const { template } = (await getTemplates()).course_assigned;
  try {
    const outcomes = await notify(
      {
        dedupeKey: `test:${admin.id}:${Date.now()}`,
        to: admin.email,
        template: { ...template, subject: `[Test] ${template.subject}` },
        values: { ...sampleValues(url), full_name: admin.name, email: admin.email, course_title: course.title },
        url,
        meta: { userId: admin.id, courseId: course.slug, campaign: "test", step: 0 },
      },
      "live",
      { sent: 0, dryRun: 0, failed: 0, alreadySent: 0 },
      providers,
    );
    await audit({ email: admin.email, action: "notification_test", detail: outcomes.map((o) => `${o.provider}=${o.status}`).join(" ") });
    const label = { email: "Email", slack: "Slack" } as const;
    const parts = outcomes.map((o) => (o.status === "sent" ? `${label[o.provider]}: sent ✓` : `${label[o.provider]}: failed — ${o.error}`));
    return { ok: outcomes.every((o) => o.status === "sent"), message: `Test sent to ${admin.email} using the “Course assigned” template. ${parts.join(" · ")}` };
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
}

/** Fetches from the HRMS without writing anything, and previews the mapping. */
export async function testHrmsAction(): Promise<ActionResult> {
  await requireAdmin();
  try {
    const list = await fetchHrmsEmployees();
    const first = list[0];
    const sample = first
      ? `First record → ${first.name} <${first.email}>, joined ${first.dateOfJoining ?? "?"}, manager ${first.managerEmail ?? "?"}.`
      : "";
    const missingDoj = list.filter((e) => !e.dateOfJoining).length;
    return {
      ok: true,
      message: `Fetched ${list.length} employees. ${sample}${missingDoj ? ` ${missingDoj} have no parseable joining date — check the date format.` : ""}`,
    };
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
}

export async function runJobAction(name: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!isJobName(name)) return { ok: false, message: "Unknown job" };
  await audit({ email: admin.email, action: "job_run_manual", detail: name });
  try {
    const res = await runJob(name, admin.email);
    revalidatePath("/admin/automation");
    if (res.skipped) return { ok: false, message: `${JOBS[name].title} is already running.` };
    return { ok: true, message: `${JOBS[name].title} finished: ${summaryText(res.summary, ", ")}` };
  } catch (e) {
    revalidatePath("/admin/automation");
    return { ok: false, message: errMsg(e) };
  }
}


export async function saveTemplateAction(key: string, t: { subject: string; body: string; cta: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!TEMPLATE_KEYS.has(key)) return { ok: false, message: "Unknown template" };
  const tpl = { subject: t.subject.trim(), body: t.body.replace(/\r\n/g, "\n").trim(), cta: t.cta.trim() };
  if (!tpl.subject || !tpl.body || !tpl.cta) return { ok: false, message: "Subject, message and button label are all required." };
  if (tpl.subject.length > 200 || tpl.cta.length > 40 || tpl.body.length > 5000)
    return { ok: false, message: "Too long: subject ≤ 200, button ≤ 40, message ≤ 5000 characters." };
  const bad = unknownFields(tpl.subject, tpl.body, tpl.cta);
  if (bad.length) return { ok: false, message: `Unknown field${bad.length > 1 ? "s" : ""}: ${bad.map((b) => `{{${b}}}`).join(", ")}` };
  await saveTemplate(key as TemplateKey, tpl, admin.email);
  await audit({ email: admin.email, action: "template_updated", detail: key });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Template saved. It applies to the next nudge run." };
}

export async function resetTemplateAction(key: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!TEMPLATE_KEYS.has(key)) return { ok: false, message: "Unknown template" };
  await saveTemplate(key as TemplateKey, null, admin.email);
  await audit({ email: admin.email, action: "template_reset", detail: key });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Reset to the default template." };
}

export async function saveCourseSettingsAction(courseId: string, input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!getCourse(courseId)) return { ok: false, message: "Unknown course" };
  const { value, errors } = validateCourseSettings(input);
  if (!value) return { ok: false, message: errors.join(". ") };
  await saveCourseSettings(courseId, value, admin.email);
  await audit({ email: admin.email, action: "course_settings_updated", courseId });
  revalidatePath("/admin/courses");
  return { ok: true, message: "Saved. Coverage applies from the next HRMS sync; the schedule from the next nudge run." };
}
