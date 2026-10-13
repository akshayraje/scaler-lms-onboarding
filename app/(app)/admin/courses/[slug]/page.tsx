import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseSettingsEditor } from "@/components/admin/CourseSettingsEditor";
import { getCourse } from "@/content/courses";
import { sql } from "drizzle-orm";
import { getCourseSettings } from "@/lib/course-settings-store";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";

/** Distinct department/designation values from the employee master, for rule suggestions. */
async function employeeFieldOptions() {
  const rows = await db.execute<{ field: "department" | "designation"; value: string; n: number }>(sql`
    select 'department' as field, ${employees.department} as value, count(*)::int as n from ${employees}
      where ${employees.status} = 'active' and ${employees.department} is not null group by 2
    union all
    select 'designation', ${employees.designation}, count(*)::int from ${employees}
      where ${employees.status} = 'active' and ${employees.designation} is not null group by 2
    order by 3 desc`);
  const out: Record<"department" | "designation", { value: string; count: number }[]> = { department: [], designation: [] };
  for (const r of rows.rows) out[r.field].push({ value: r.value, count: r.n });
  return out;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: `${getCourse((await params).slug)?.title ?? "Course"} · Admin` };
}

export default async function CourseSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const course = getCourse((await params).slug);
  if (!course) notFound();
  const [settings, options] = await Promise.all([getCourseSettings(course.slug), employeeFieldOptions()]);
  return (
    <>
      <Link href="/admin/courses" className="mb-3 inline-block text-sm font-semibold text-primary hover:underline">
        ← All courses
      </Link>
      <h2 className="mb-5 text-2xl">{course.title}</h2>
      <CourseSettingsEditor courseId={course.slug} initial={settings} fieldOptions={options} />
    </>
  );
}
