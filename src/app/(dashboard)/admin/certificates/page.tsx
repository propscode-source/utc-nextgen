import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  CourseManagementTable,
  IssuedCertsTable,
  type CourseRow,
  type IssuedCertRow,
} from "./certs-tables";

export const metadata: Metadata = { title: "Kelola Sertifikat" };

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ lab?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    redirect("/dashboard");
  }
  const { lab: labSlug } = await searchParams;

  const isSuper = session.user.role === "SUPERADMIN";
  const labWhereForUser = isSuper
    ? {}
    : {
        OR: [
          { adminId: session.user.id },
          { members: { some: { userId: session.user.id, role: "ASSISTANT" as const } } },
        ],
      };

  const labs = await prisma.lab.findMany({
    where: labWhereForUser,
    select: { id: true, slug: true, name: true, _count: { select: { courses: true } } },
    orderBy: { name: "asc" },
  });
  const allowedLabIds = new Set(labs.map((l) => l.id));

  const courses = await prisma.course.findMany({
    where: { labId: { in: Array.from(allowedLabIds) } },
    select: {
      id: true,
      slug: true,
      title: true,
      lab: { select: { name: true, slug: true } },
      _count: { select: { certificates: true } },
      certificateTemplate: { select: { id: true } },
    },
    orderBy: [{ lab: { name: "asc" } }, { title: "asc" }],
  });

  const filteredCoursesByLab = courses.filter((c) => !labSlug || c.lab.slug === labSlug);

  const certs = await prisma.certificate.findMany({
    where: {
      course: {
        labId: { in: Array.from(allowedLabIds) },
        ...(labSlug && { lab: { slug: labSlug } }),
      },
    },
    include: {
      user: { select: { name: true, email: true, nim: true } },
      course: { select: { id: true, slug: true, title: true, lab: { select: { name: true, slug: true } } } },
    },
    orderBy: { issuedAt: "desc" },
    take: 500,
  });

  const courseRows: CourseRow[] = filteredCoursesByLab.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    lab: c.lab,
    certificateCount: c._count.certificates,
    hasCustomTemplate: !!c.certificateTemplate,
  }));

  const certRows: IssuedCertRow[] = certs.map((c) => ({
    id: c.id,
    certNumber: c.certNumber,
    issuedAt: c.issuedAt,
    user: c.user,
    course: c.course,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Sertifikat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lihat semua sertifikat yang sudah diterbitkan, design template per course, dan backfill untuk
          mahasiswa yang sudah lulus.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/admin/certificates"
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${!labSlug ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
        >
          Semua
        </Link>
        {labs.map((l) => (
          <Link
            key={l.id}
            href={`/admin/certificates?lab=${l.slug}`}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${labSlug === l.slug ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
          >
            {l.name}
          </Link>
        ))}
      </div>

      <CourseManagementTable courses={courseRows} />
      <IssuedCertsTable certs={certRows} />
    </div>
  );
}
