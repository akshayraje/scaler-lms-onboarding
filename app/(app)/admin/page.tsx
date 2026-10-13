import { redirect } from "next/navigation";

// Admin opens on Courses (each course has its own report).
export default function AdminIndex() {
  redirect("/admin/courses");
}
