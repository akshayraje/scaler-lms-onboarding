import { eq, sql } from "drizzle-orm";
import { Eyebrow } from "@/components/course/kit";
import { getCourse } from "@/content/courses";
import { db } from "@/lib/db";
import { certificates, user } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificate verification" };

// Public page: anyone with the code can confirm a certificate is genuine.
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const [row] = await db
    .select({
      name: sql<string>`coalesce(${user.name}, ${user.email})`,
      email: user.email,
      courseId: certificates.courseId,
      score: certificates.score,
      issuedAt: certificates.issuedAt,
      expiresAt: certificates.expiresAt,
    })
    .from(certificates)
    .innerJoin(user, eq(user.id, certificates.userId))
    .where(eq(certificates.code, code));

  const expired = row?.expiresAt && row.expiresAt < new Date();
  return (
    <main className="mx-auto max-w-[640px] px-4 py-8 sm:px-6 sm:py-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mx-auto mb-6 h-6 sm:h-7" src="/scaler-logo.png" alt="Scaler" />
      <div className="rounded-xl border bg-card px-5 py-7 sm:px-9">
        <Eyebrow>Certificate verification</Eyebrow>
        {!row ? (
          <>
            <h1>Certificate not found</h1>
            <p>No certificate matches code {code}.</p>
          </>
        ) : (
          <>
            <h1>{expired ? "Certificate expired" : "Certificate verified ✅"}</h1>
            <p>
              <strong>{row.name}</strong> (<span className="break-all">{row.email}</span>) completed{" "}
              <em>{getCourse(row.courseId)?.title ?? row.courseId}</em> on {formatDate(row.issuedAt)} with a score of{" "}
              {row.score}%.
            </p>
            {row.expiresAt && (
              <p className="text-sm text-muted-foreground">
                {expired ? "Expired" : "Valid until"} {formatDate(row.expiresAt)}.
              </p>
            )}
            <p className="mt-4 font-mono text-sm text-muted-foreground">Certificate code: {code}</p>
          </>
        )}
      </div>
    </main>
  );
}
