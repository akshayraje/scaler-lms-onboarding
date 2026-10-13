import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { appSettings } from "./db/schema";

// Admin-editable, non-secret settings stored in Postgres. All credentials
// (Slack, SMTP, Darwinbox) are environment variables — see lib/automation/config.ts.

export type NotificationMode = "off" | "dry_run" | "live";

export type SettingsShape = {
  notifications: { mode: NotificationMode };
};

export type SettingsKey = keyof SettingsShape;

export const DEFAULTS: SettingsShape = {
  notifications: { mode: "dry_run" },
};

export async function getSettings<K extends SettingsKey>(key: K): Promise<SettingsShape[K]> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  const stored = (row?.value ?? {}) as Record<string, unknown>;
  return { ...DEFAULTS[key], ...stored } as SettingsShape[K];
}

export async function saveSettings<K extends SettingsKey>(key: K, values: Partial<SettingsShape[K]>, updatedBy: string) {
  const next = { ...(await getSettings(key)), ...values };
  await db
    .insert(appSettings)
    .values({ key, value: next, updatedBy })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: next, updatedBy, updatedAt: new Date() } });
}
