import "server-only";
import { eq } from "drizzle-orm";
import { slackConfig, smtpConfig } from "@/lib/automation/config";
import { sendEmail } from "@/lib/automation/email";
import { slackLookupUser, slackSendDm } from "@/lib/automation/slack";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { emailDocument, type RenderedMessage } from "./templates";

// Delivery providers for the unified notification pipeline. Each takes the same
// rendered message; a provider is used when it's configured. Providers that
// don't support CC (Slack) simply deliver to the recipient only.

export type ProviderId = "email" | "slack";

export type Outbound = {
  /** Recipient's work email (also used to find them on Slack). */
  to: string;
  cc: string[];
  message: RenderedMessage;
  /** Target of the call-to-action button. */
  url: string;
};

export interface NotificationProvider {
  id: ProviderId;
  supportsCc: boolean;
  send(o: Outbound): Promise<void>;
}

function emailProvider(): NotificationProvider | null {
  const smtp = smtpConfig();
  if (!smtp) return null;
  return {
    id: "email",
    supportsCc: true,
    send: (o) =>
      sendEmail(smtp, {
        to: o.to,
        cc: o.cc,
        subject: o.message.subject,
        text: `${o.message.plainText}\n\n${o.message.cta}: ${o.url}`,
        html: emailDocument(o.message.emailHtml, o.message.cta, o.url),
      }),
  };
}

function slackProvider(): NotificationProvider | null {
  const slack = slackConfig();
  if (!slack) return null;
  const ids = new Map<string, string | null>(); // per-run lookup cache
  async function memberId(email: string) {
    if (!ids.has(email)) {
      const [cached] = await db.select({ id: employees.slackUserId }).from(employees).where(eq(employees.email, email));
      let id = cached?.id ?? null;
      if (!id) {
        id = await slackLookupUser(slack!.botToken, email);
        if (id) await db.update(employees).set({ slackUserId: id }).where(eq(employees.email, email));
      }
      ids.set(email, id);
    }
    return ids.get(email) ?? null;
  }
  return {
    id: "slack",
    supportsCc: false,
    async send(o) {
      const id = await memberId(o.to);
      if (!id) throw new Error("Not found in Slack workspace");
      await slackSendDm(slack.botToken, id, {
        text: o.message.subject,
        heading: o.message.subject.slice(0, 150), // header block limit
        body: o.message.slackMrkdwn,
        ctaLabel: o.message.cta,
        ctaUrl: o.url,
      });
    },
  };
}

/** Providers that are configured right now. */
export function availableProviders(): NotificationProvider[] {
  return [emailProvider(), slackProvider()].filter((p): p is NotificationProvider => !!p);
}
