import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCourseProgressForUser } from "@/lib/courses";
import { MyCoursesList, type MyCourseItem } from "./my-courses-list";

export const metadata: Metadata = { title: "Course Saya" };

export default async function MyCoursesPage() {
  const session = await auth();
  if (!session) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: {
      course: {
        include: {
          lab: { select: { name: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const items: MyCourseItem[] = await Promise.all(
    enrollments.map(async (e) => ({
      id: e.id,
      course: {
        slug: e.course.slug,
        title: e.course.title,
        lab: { name: e.course.lab.name },
      },
      progress: await getCourseProgressForUser(e.courseId, session.user.id),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Course Saya</h1>
        <p className="text-sm text-muted-foreground mt-1">Lanjutkan pembelajaran kamu.</p>
      </div>

      <MyCoursesList items={items} />
    </div>
  );
}
