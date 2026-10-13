import "server-only";

// Minimal Slack Web API client (no SDK). Bot token scopes needed:
//   chat:write, users:read, users:read.email

type SlackResponse = { ok: boolean; error?: string; [k: string]: unknown };

async function call(token: string, method: string, body: Record<string, unknown>): Promise<SlackResponse> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Slack ${method}: HTTP ${res.status}`);
  return (await res.json()) as SlackResponse;
}

// users.lookupByEmail only accepts form-encoded params.
async function callForm(token: string, method: string, params: Record<string, string>): Promise<SlackResponse> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`Slack ${method}: HTTP ${res.status}`);
  return (await res.json()) as SlackResponse;
}

/** Slack member id for an email, or null if they aren't in the workspace. */
export async function slackLookupUser(token: string, email: string): Promise<string | null> {
  const r = await callForm(token, "users.lookupByEmail", { email });
  if (r.ok) return (r.user as { id: string }).id;
  if (r.error === "users_not_found") return null;
  throw new Error(`Slack lookup failed: ${r.error}`);
}

export type SlackMessage = { text: string; heading: string; body: string; ctaLabel: string; ctaUrl: string };

/** DM a user (posting to a member id delivers to the bot's DM with them). */
export async function slackSendDm(token: string, userId: string, m: SlackMessage) {
  const r = await call(token, "chat.postMessage", {
    channel: userId,
    text: m.text, // notification / fallback text
    unfurl_links: false,
    blocks: [
      { type: "header", text: { type: "plain_text", text: m.heading } },
      { type: "section", text: { type: "mrkdwn", text: m.body } },
      {
        type: "actions",
        elements: [{ type: "button", style: "primary", text: { type: "plain_text", text: m.ctaLabel }, url: m.ctaUrl }],
      },
    ],
  });
  if (!r.ok) throw new Error(`Slack send failed: ${r.error}`);
}
