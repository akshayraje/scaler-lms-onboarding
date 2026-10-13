import { TopNav } from "@/components/nav/TopNav";
import { requireUser } from "@/lib/session";

// Shell for every signed-in page (dashboard, courses, admin).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <TopNav user={user} />
      {children}
    </>
  );
}
