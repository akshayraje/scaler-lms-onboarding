import "server-only";
import nodemailer from "nodemailer";
import type { SmtpConfig } from "./config";

export type EmailMessage = { to: string; cc?: string[]; subject: string; text: string; html: string };

export function smtpTransport(s: SmtpConfig) {
  return nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure,
    auth: s.user ? { user: s.user, pass: s.password } : undefined,
  });
}

export async function sendEmail(s: SmtpConfig, m: EmailMessage) {
  if (!s.host || !s.fromEmail) throw new Error("SMTP host and from-address must be configured");
  await smtpTransport(s).sendMail({
    from: { name: s.fromName || "Scaler Learning", address: s.fromEmail },
    to: m.to,
    cc: m.cc?.length ? m.cc : undefined,
    subject: m.subject,
    text: m.text,
    html: m.html,
  });
}

