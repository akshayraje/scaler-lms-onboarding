import { redirect } from "next/navigation";

// Certificates printed by the original app link to /api/verify/<code>.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  redirect(`/verify/${encodeURIComponent((await params).code)}`);
}
