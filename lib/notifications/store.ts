import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { TEMPLATES, type MessageTemplate, type TemplateKey } from "./templates";

// Admin edits to notification templates, stored as overrides of the defaults in code.

const KEY = "notification_templates";

async function overrides(): Promise<Partial<Record<TemplateKey, MessageTemplate>>> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY));
  return (row?.value ?? {}) as Partial<Record<TemplateKey, MessageTemplate>>;
}

export async function getTemplates() {
  const o = await overrides();
  return Object.fromEntries(
    TEMPLATES.map((t) => [t.key, { template: o[t.key] ?? t.defaults, customised: !!o[t.key] }]),
  ) as Record<TemplateKey, { template: MessageTemplate; customised: boolean }>;
}

export async function saveTemplate(key: TemplateKey, t: MessageTemplate | null, updatedBy: string) {
  const next = { ...(await overrides()) };
  if (t) next[key] = t;
  else delete next[key]; // reset to default
  await db
    .insert(appSettings)
    .values({ key: KEY, value: next, updatedBy })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: next, updatedBy, updatedAt: new Date() } });
}
