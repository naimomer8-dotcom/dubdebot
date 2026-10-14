import { notFound } from "next/navigation";
import CoursesClient from "@/components/CoursesClient";
import { LIBRARY } from "@/lib/courses";

// Design preview with sample data. Disabled in production.
export default async function PreviewCourses({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const paid = !!(await searchParams).paid;
  const until = new Date(Date.now() + (paid ? 300 : 20) * 864e5).toISOString();
  return (
    <CoursesClient
      user={{ id: "preview", firstName: "מיכל", fullName: "מיכל כהן", phone: "0501234567", email: "michal@example.com", access: { status: paid ? "paid" : "trial", plan: paid ? "paid" : "trial", tier: paid ? "basic" : null, accessUntil: until, daysLeft: paid ? 300 : 20, renewalRequestedAt: null, renewalMode: "none" } }}
      conversations={[{ id: "c1", title: "איך מעלים מחירים בסטודיו", mode: "chat", updated_at: "", pinned: true, folder: null }]}
      leadSent={false}
      links={paid ? Object.fromEntries(LIBRARY.map((c) => [String(c.id), "https://my.schooler.biz/"])) : {}}
    />
  );
}
