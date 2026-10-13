import { headers } from "next/headers";
import { db } from "./db";
import { auditLog } from "./db/schema";

type AuditEntry = {
  userId?: string | null;
  email?: string | null;
  action: string;
  courseId?: string | null;
  detail?: string | null;
  ip?: string | null;
};

export async function requestIp(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  } catch {
    return null; // outside a request scope (scripts)
  }
}

export async function audit(entry: AuditEntry) {
  await db.insert(auditLog).values({
    userId: entry.userId ?? null,
    email: entry.email ?? null,
    action: entry.action,
    courseId: entry.courseId ?? null,
    detail: entry.detail ?? null,
    ip: entry.ip ?? (await requestIp()),
  });
}
