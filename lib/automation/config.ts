import "server-only";

// Notification channel credentials come from the environment (not the admin UI).
// A channel is active when its required variables are set.

export type SlackConfig = { botToken: string };
export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
};

export function slackConfig(): SlackConfig | null {
  const botToken = process.env.SLACK_BOT_TOKEN?.trim();
  return botToken ? { botToken } : null;
}

export function smtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim();
  if (!host || !fromEmail) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    fromName: process.env.SMTP_FROM_NAME ?? "Scaler Learning",
    fromEmail,
  };
}

export type HrmsConnection =
  | { provider: "none" }
  | { provider: "mock" }
  | { provider: "darwinbox"; baseUrl: string; username: string; password: string; apiKey: string; datasetKey: string };

/**
 * HRMS connection from env. HRMS_PROVIDER = darwinbox | mock | none; defaults to
 * darwinbox when DARWINBOX_* credentials are present.
 */
export function hrmsConnection(): HrmsConnection {
  const e = process.env;
  const provider = e.HRMS_PROVIDER?.trim() || (e.DARWINBOX_API_KEY ? "darwinbox" : "none");
  if (provider === "mock") return { provider: "mock" };
  if (provider !== "darwinbox") return { provider: "none" };
  return {
    provider: "darwinbox",
    baseUrl: e.DARWINBOX_BASE_URL?.trim() ?? "",
    username: e.DARWINBOX_USERNAME ?? "",
    password: e.DARWINBOX_PASSWORD ?? "",
    apiKey: e.DARWINBOX_API_KEY ?? "",
    datasetKey: e.DARWINBOX_DATASET_KEY ?? "",
  };
}
