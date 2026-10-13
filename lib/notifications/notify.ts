import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import type { NotificationMode } from "@/lib/settings";
import { availableProviders, type NotificationProvider, type ProviderId } from "./providers";
import { renderMessage, type FieldValues, type MessageTemplate } from "./templates";

// Unified notification pipeline: render a template once, then deliver it through
// every available provider. Idempotent per (dedupeKey, provider); honours the
// notification mode (off / dry run / live) and records every attempt.

export type NotifyRequest = {
  /** Stable key for this logical message, e.g. campaign:course:user:cycle:step. */
  dedupeKey: string;
  to: string;
  cc?: string[];
  template: MessageTemplate;
  values: FieldValues;
  url: string;
  /** For the notification log. */
  meta: { userId: string; courseId: string; campaign: "new_joiner" | "renewal" | "test"; step: number; jobRunId?: number };
};

export type NotifyTally = { sent: number; dryRun: number; failed: number; alreadySent: number };

export type ProviderOutcome = { provider: ProviderId; status: "sent" | "failed" | "dry_run" | "already_sent"; error?: string };

export async function notify(
  req: NotifyRequest,
  mode: NotificationMode,
  tally: NotifyTally,
  providers: NotificationProvider[] = availableProviders(),
): Promise<ProviderOutcome[]> {
  const outcomes: ProviderOutcome[] = [];
  if (mode === "off" || !providers.length) return outcomes;
  const cc = req.cc?.filter(Boolean) ?? [];
  // Only mention the CC if a provider that supports CC will deliver it.
  const ccNote = cc.length && providers.some((p) => p.supportsCc) ? "Your manager has been copied on this reminder." : undefined;
  const message = renderMessage(req.template, req.values, { note: ccNote });

  for (const provider of providers) {
    const dedupeKey = `${mode}:${req.dedupeKey}:${provider.id}`;
    const [prev] = await db.select({ status: notifications.status }).from(notifications).where(eq(notifications.dedupeKey, dedupeKey));
    if (prev && prev.status !== "failed") {
      tally.alreadySent++;
      outcomes.push({ provider: provider.id, status: "already_sent" });
      continue;
    }
    const providerCc = provider.supportsCc ? cc : [];

    let status: "sent" | "failed" | "dry_run" = "dry_run";
    let error: string | null = null;
    if (mode === "live") {
      try {
        await provider.send({ to: req.to, cc: providerCc, message, url: req.url });
        status = "sent";
      } catch (e) {
        status = "failed";
        error = e instanceof Error ? e.message : String(e);
      }
    }
    tally[status === "sent" ? "sent" : status === "failed" ? "failed" : "dryRun"]++;
    outcomes.push({ provider: provider.id, status, ...(error ? { error } : {}) });

    const row = {
      dedupeKey,
      userId: req.meta.userId,
      courseId: req.meta.courseId,
      campaign: req.meta.campaign,
      step: req.meta.step,
      channel: provider.id,
      recipient: req.to,
      cc: providerCc.join(", ") || null,
      status,
      subject: message.subject,
      body: provider.id === "slack" ? message.slackMrkdwn : message.plainText,
      error,
      jobRunId: req.meta.jobRunId ?? null,
    };
    // A failed attempt is retried on the next run by overwriting its row.
    await db.insert(notifications).values(row).onConflictDoUpdate({ target: notifications.dedupeKey, set: { ...row, createdAt: new Date() } });
  }
  return outcomes;
}
