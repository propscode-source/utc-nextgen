import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CoursesList, type CourseListItem } from "./courses-list";

export const metadata: Metadata = { title: "Katalog Course" };

export default async function CourseCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ lab?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  const { lab: labFilter } = await searchParams;

  const [labs, courses, myEnrollments] = await Promise.all([
    prisma.lab.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({
      where: labFilter ? { lab: { slug: labFilter } } : undefined,
      include: {
        lab: { select: { name: true, slug: true } },
        _count: { select: { sections: true, enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { userId: session.user.id },
      select: { courseId: true },
    }),
  ]);

  const courseItems: CourseListItem[] = courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    isLocked: c.isLocked,
    pointPrice: c.pointPrice,
    lab: c.lab,
    _count: c._count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Katalog Course</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih course dari salah satu lab untuk mulai belajar.
        </p>
      </div>

      <CoursesList
        labs={labs}
        labFilter={labFilter}
        courses={courseItems}
        enrolledIds={myEnrollments.map((e) => e.courseId)}
      />
    </div>
  );
}
