import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CourseCreateButton } from "./course-create-button";
import { ReadOnlyNotice } from "@/components/read-only-notice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faGraduationCap, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

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

  return (
    <div className="space-y-4">
      {!canManage ? (
        <ReadOnlyNotice adminName={lab.admin?.name ?? null} />
      ) : (
        <div className="flex justify-end">
          <CourseCreateButton labId={lab.id} slug={slug} />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Section</TableHead>
                <TableHead className="text-right">Peserta</TableHead>
                <TableHead>Akses</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    Belum ada course.
                  </TableCell>
                </TableRow>
              )}
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3 text-muted-foreground mr-1" />
                    {c._count.sections}
                  </TableCell>
                  <TableCell className="text-right">
                    <FontAwesomeIcon icon={faGraduationCap} className="h-3 w-3 text-muted-foreground mr-1" />
                    {c._count.enrollments}
                  </TableCell>
                  <TableCell>
                    {c.isLocked ? (
                      <Badge variant="warning">Bayar {c.pointPrice} poin</Badge>
                    ) : (
                      <Badge variant="success">Gratis</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/labs/${slug}/courses/${c.id}/edit`}>
                          <FontAwesomeIcon icon={faPenToSquare} /> Editor
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/courses/${c.slug}`}>Buka</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
