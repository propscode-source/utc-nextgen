import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isEnrolled, getCourseProgressForUser } from "@/lib/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EnrollButton } from "./enroll-button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLayerGroup,
  faGraduationCap,
  faCoins,
  faLock,
  faPlay,
  faCircleCheck,
  faClipboardQuestion,
  faCirclePlay,
} from "@fortawesome/free-solid-svg-icons";
import { formatPoints } from "@/lib/utils";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      lab: { select: { name: true, slug: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
          quiz: { include: { _count: { select: { questions: true } } } },
        },
      },
      pretestQuiz: { select: { id: true } },
      finalQuiz: { select: { id: true } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course) notFound();

  const enrolled = await isEnrolled(session.user.id, course.id);
  const progress = enrolled
    ? await getCourseProgressForUser(course.id, session.user.id)
    : null;

  // Exam status (pretest + final) when enrolled.
  let pretestPassed = false;
  let finalPassed: { score: number | null } | null = null;
  if (enrolled && course.pretestQuiz) {
    const p = await prisma.examSession.findFirst({
      where: { quizId: course.pretestQuiz.id, userId: session.user.id, passed: true },
      select: { id: true },
    });
    pretestPassed = !!p;
  }
  if (enrolled && course.finalQuiz) {
    const f = await prisma.examSession.findFirst({
      where: { quizId: course.finalQuiz.id, userId: session.user.id, passed: true },
      select: { score: true },
      orderBy: { submittedAt: "desc" },
    });
    finalPassed = f;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{course.lab.name}</Badge>
              {course.isLocked && (
                <Badge variant="warning">
                  <FontAwesomeIcon icon={faLock} className="mr-1 h-2.5 w-2.5" />
                  Bayar {formatPoints(course.pointPrice)} poin
                </Badge>
              )}
              {enrolled && <Badge variant="success">Terdaftar</Badge>}
            </div>
            <CardTitle className="text-2xl">{course.title}</CardTitle>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{course.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
                {course.sections.length} section
              </span>
              <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faGraduationCap} className="h-3 w-3" />
                {course._count.enrollments} peserta
              </span>
              <span>Lulus exam ≥ {course.passScore}%</span>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Struktur materi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {course.sections.map((s, idx) => {
                const unlocked = !!progress?.unlockedSectionIds.has(s.id) || !enrolled;
                const passed = !!progress?.sectionPassed.has(s.id);
                return (
                  <li key={s.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                            passed
                              ? "bg-emerald-500 text-white"
                              : unlocked
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {passed ? <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5" /> : idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.title}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {s.lessons.length} lesson
                            {s.quiz && ` · 1 quiz (${s.quiz._count.questions} soal, lulus ≥ ${s.quiz.minScore}%)`}
                          </div>
                        </div>
                      </div>
                      {!unlocked && (
                        <Badge variant="outline">
                          <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5 mr-1" /> Terkunci
                        </Badge>
                      )}
                    </div>
                    {unlocked && (
                      <ul className="mt-3 ml-10 space-y-1.5">
                        {s.lessons.map((l) => {
                          const completed = progress?.completedLessonIds.has(l.id);
                          return (
                            <li key={l.id} className="flex items-center gap-2 text-xs">
                              <FontAwesomeIcon
                                icon={completed ? faCircleCheck : faCirclePlay}
                                className={`h-3 w-3 ${completed ? "text-emerald-500" : "text-muted-foreground"}`}
                              />
                              <span className={completed ? "text-muted-foreground line-through" : ""}>
                                {l.title}
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground uppercase text-[10px]">{l.type}</span>
                            </li>
                          );
                        })}
                        {s.quiz && (
                          <li className="flex items-center gap-2 text-xs">
                            <FontAwesomeIcon
                              icon={passed ? faCircleCheck : faClipboardQuestion}
                              className={`h-3 w-3 ${passed ? "text-emerald-500" : "text-amber-500"}`}
                            />
                            <span className={passed ? "text-muted-foreground" : ""}>
                              Quiz section
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              {passed ? "Lulus" : "Wajib lulus untuk lanjut"}
                            </span>
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
              {course.sections.length === 0 && (
                <li className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Course ini belum punya section.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            {enrolled ? (
              <>
                <div>
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">Progress</div>
                  <div className="text-2xl font-bold">{progress?.progressPct ?? 0}%</div>
                </div>
                <Progress value={progress?.progressPct ?? 0} />
                <Button asChild className="w-full mt-2">
                  <Link href={`/courses/${course.slug}/learn`}>
                    <FontAwesomeIcon icon={faPlay} /> Lanjut belajar
                  </Link>
                </Button>

                {/* Pretest CTA */}
                {course.pretestQuiz && (
                  <div className="rounded-md border p-3 bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium">Pretest</div>
                      {pretestPassed ? (
                        <Badge variant="success" className="text-[10px]">Lulus</Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">Belum</Badge>
                      )}
                    </div>
                    <Button asChild variant={pretestPassed ? "outline" : "default"} size="sm" className="w-full">
                      <Link href={`/courses/${course.slug}/exam/pretest`}>
                        {pretestPassed ? "Tinjau pretest" : "Kerjakan pretest"}
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Final exam CTA */}
                {course.finalQuiz && (
                  <div className="rounded-md border p-3 bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium">Final Exam</div>
                      {finalPassed ? (
                        <Badge variant="success" className="text-[10px]">Lulus {finalPassed.score}%</Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">Belum</Badge>
                      )}
                    </div>
                    <Button
                      asChild
                      variant={finalPassed ? "outline" : "default"}
                      size="sm"
                      className="w-full"
                    >
                      <Link href={`/courses/${course.slug}/exam/final`}>
                        {finalPassed ? "Lihat hasil ujian" : "Mulai final exam"}
                      </Link>
                    </Button>
                    {!finalPassed && (
                      <p className="text-[10px] text-muted-foreground">
                        Lulus untuk dapatkan sertifikat (Modul 7).
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Akses course</div>
                {course.isLocked ? (
                  <p className="text-sm">
                    Course ini terkunci. Buka dengan{" "}
                    <strong>{formatPoints(course.pointPrice)} poin</strong>. Saat ini kamu punya{" "}
                    <strong>{formatPoints(session.user.points)}</strong> poin.
                  </p>
                ) : course.pointPrice > 0 ? (
                  <p className="text-sm">
                    Mendaftar gratis. Disarankan tukar{" "}
                    <strong>{formatPoints(course.pointPrice)} poin</strong> untuk akses penuh setelah
                    pelatihan.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Course gratis untuk semua mahasiswa terdaftar.</p>
                )}
                <EnrollButton
                  courseId={course.id}
                  slug={course.slug}
                  isLocked={course.isLocked}
                  pointPrice={course.pointPrice}
                  userPoints={session.user.points}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
