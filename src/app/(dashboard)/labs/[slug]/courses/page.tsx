import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { CourseCreateButton } from "./course-create-button";
import { ReadOnlyNotice } from "@/components/read-only-notice";
import { LabCoursesTable, type LabCourseRow } from "./lab-courses-table";

export default async function LabCoursesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const lab = await prisma.lab.findUnique({
    where: { slug },
    select: { id: true, admin: { select: { name: true } } },
  });
  if (!lab) notFound();

  const canManage = await canManageLab(session.user.id, session.user.role, lab.id);

  const courses = await prisma.course.findMany({
    where: { labId: lab.id },
    include: { _count: { select: { sections: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows: LabCourseRow[] = courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    isLocked: c.isLocked,
    pointPrice: c.pointPrice,
    sectionCount: c._count.sections,
    enrollmentCount: c._count.enrollments,
  }));

  return (
    <div className="space-y-4">
      {!canManage ? (
        <ReadOnlyNotice adminName={lab.admin?.name ?? null} />
      ) : (
        <div className="flex justify-end">
          <CourseCreateButton labId={lab.id} slug={slug} />
        </div>
      )}

      <LabCoursesTable courses={rows} labSlug={slug} canManage={canManage} />
    </div>
  );
}
