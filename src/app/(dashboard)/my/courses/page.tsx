import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCourseProgressForUser } from "@/lib/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faGraduationCap } from "@fortawesome/free-solid-svg-icons";

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

  const data = await Promise.all(
    enrollments.map(async (e) => ({
      ...e,
      progress: await getCourseProgressForUser(e.courseId, session.user.id),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Course Saya</h1>
        <p className="text-sm text-muted-foreground mt-1">Lanjutkan pembelajaran kamu.</p>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FontAwesomeIcon icon={faGraduationCap} className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada course terdaftar.</p>
            <Button asChild className="mt-4">
              <Link href="/courses">Telusuri katalog</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <Card key={e.id} className="flex flex-col">
              <CardHeader className="space-y-1.5">
                <Badge variant="secondary" className="self-start text-[10px]">
                  {e.course.lab.name}
                </Badge>
                <CardTitle className="text-base">{e.course.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <Progress value={e.progress.progressPct} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{e.progress.progressPct}% selesai</span>
                  {e.progress.fullyDone && <Badge variant="success">Selesai</Badge>}
                </div>
                <Button asChild className="mt-auto" variant={e.progress.fullyDone ? "outline" : "default"}>
                  <Link href={`/courses/${e.course.slug}/learn`}>
                    <FontAwesomeIcon icon={faPlay} />
                    {e.progress.fullyDone ? "Tinjau ulang" : "Lanjut belajar"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
