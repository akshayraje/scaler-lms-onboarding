import { Eyebrow } from "@/components/course/kit";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-10">
      <Eyebrow>Admin</Eyebrow>
      <AdminTabs />
      {children}
    </main>
  );
}
