import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationProvider, Outbound } from "./providers";

// In-memory stand-in for the notifications table.
const rows = new Map<string, { status: string; cc: string | null }>();
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => [...rows.values()].filter((r) => r === rows.get(currentKey)).map((r) => ({ status: r.status })),
      }),
    }),
    insert: () => ({
      values: (row: { dedupeKey: string; status: string; cc: string | null }) => ({
        onConflictDoUpdate: async () => void rows.set(row.dedupeKey, { status: row.status, cc: row.cc }),
      }),
    }),
  },
}));
vi.mock("drizzle-orm", async (orig) => ({
  ...(await orig<typeof import("drizzle-orm")>()),
  eq: (_col: unknown, key: string) => ((currentKey = key), true),
}));
let currentKey = "";

const { notify } = await import("./notify");

function fakeProvider(id: "email" | "slack", supportsCc: boolean) {
  const sent: Outbound[] = [];
  const p: NotificationProvider = { id, supportsCc, send: async (o) => void sent.push(o) };
  return { p, sent };
}

const req = {
  dedupeKey: "new_joiner:posh-pocso:u1:2026-01-01:3",
  to: "learner@scaler.com",
  cc: ["manager@scaler.com"],
  template: { subject: "Reminder for {{full_name}}", body: "Hi **{{full_name}}**", cta: "Open" },
  values: { full_name: "Priya Sharma" },
  url: "https://x.test/c",
  meta: { userId: "u1", courseId: "posh-pocso", campaign: "new_joiner" as const, step: 3 },
};
const tally = () => ({ sent: 0, dryRun: 0, failed: 0, alreadySent: 0 });

describe("notify (unified pipeline)", () => {
  beforeEach(() => rows.clear());

  it("sends the same rendered message to every provider; only CC-capable ones get the CC", async () => {
    const email = fakeProvider("email", true);
    const slack = fakeProvider("slack", false);
    const t = tally();
    await notify(req, "live", t, [email.p, slack.p]);
    expect(t.sent).toBe(2);
    expect(email.sent[0].cc).toEqual(["manager@scaler.com"]);
    expect(slack.sent[0].cc).toEqual([]);
    expect(slack.sent[0].to).toBe("learner@scaler.com");
    expect(email.sent[0].message).toBe(slack.sent[0].message); // one render, shared
    expect(email.sent[0].message.subject).toBe("Reminder for Priya Sharma");
  });

  it("is idempotent per provider", async () => {
    const email = fakeProvider("email", true);
    await notify(req, "live", tally(), [email.p]);
    const t = tally();
    await notify(req, "live", t, [email.p]);
    expect(email.sent).toHaveLength(1);
    expect(t.alreadySent).toBe(1);
  });

  it("dry run renders and logs but doesn't send", async () => {
    const email = fakeProvider("email", true);
    const t = tally();
    await notify(req, "dry_run", t, [email.p]);
    expect(email.sent).toHaveLength(0);
    expect(t.dryRun).toBe(1);
  });

  it("doesn't mention the CC when no provider can deliver it", async () => {
    const slack = fakeProvider("slack", false);
    await notify(req, "live", tally(), [slack.p]);
    expect(slack.sent[0].message.slackMrkdwn).not.toContain("manager has been copied");
  });
});
