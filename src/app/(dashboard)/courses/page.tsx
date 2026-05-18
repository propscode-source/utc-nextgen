import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap, faLayerGroup, faCoins, faLock } from "@fortawesome/free-solid-svg-icons";
import { formatPoints } from "@/lib/utils";

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
  const enrolledIds = new Set(myEnrollments.map((e) => e.courseId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Katalog Course</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih course dari salah satu lab untuk mulai belajar.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/courses"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${!labFilter ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
        >
          Semua lab
        </Link>
        {labs.map((l) => (
          <Link
            key={l.slug}
            href={`/courses?lab=${l.slug}`}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${labFilter === l.slug ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
          >
            {l.name}
          </Link>
        ))}
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada course di kategori ini.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const enrolled = enrolledIds.has(c.id);
            return (
              <Card key={c.id} className="hover:shadow-md transition flex flex-col">
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {c.lab.name}
                    </Badge>
                    {c.isLocked && (
                      <Badge variant="warning" className="text-[10px]">
                        <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5 mr-1" />
                        {formatPoints(c.pointPrice)} poin
                      </Badge>
                    )}
                    {enrolled && (
                      <Badge variant="success" className="text-[10px]">
                        Terdaftar
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base">
                    <Link href={`/courses/${c.slug}`} className="hover:underline">
                      {c.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
                    {c.description || "Tidak ada deskripsi."}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
                      {c._count.sections} section
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FontAwesomeIcon icon={faGraduationCap} className="h-3 w-3" />
                      {c._count.enrollments} peserta
                    </span>
                    {c.pointPrice > 0 && !c.isLocked && (
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <FontAwesomeIcon icon={faCoins} className="h-3 w-3" />
                        {formatPoints(c.pointPrice)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
