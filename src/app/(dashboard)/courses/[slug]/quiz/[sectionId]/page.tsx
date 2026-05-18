import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCourseProgressForUser, isEnrolled } from "@/lib/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuizRunner } from "./quiz-runner";
import { CooldownCounter } from "./cooldown-counter";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleXmark, faClipboardQuestion } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";

export default async function SectionQuizPage({
  params,
}: {
  params: Promise<{ slug: string; sectionId: string }>;
}) {
  const { slug, sectionId } = await params;
  const session = await auth();
  if (!session) return null;

  const course = await prisma.course.findUnique({ where: { slug }, select: { id: true, title: true } });
  if (!course) notFound();

  const enrolled = await isEnrolled(session.user.id, course.id);
  if (!enrolled) redirect(`/courses/${slug}`);

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { choices: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  if (!section || section.courseId !== course.id) notFound();
  if (!section.quiz)
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Section ini belum punya quiz.
        </CardContent>
      </Card>
    );

  const progress = await getCourseProgressForUser(course.id, session.user.id);
  if (!progress.unlockedSectionIds.has(section.id)) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <FontAwesomeIcon icon={faCircleXmark} className="h-8 w-8 text-amber-500" />
          <p className="text-sm">Section ini belum terbuka. Selesaikan section sebelumnya dulu.</p>
          <Button asChild variant="outline">
            <Link href={`/courses/${slug}/learn`}>Kembali ke pembelajaran</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: section.quiz.id, userId: session.user.id },
    orderBy: { startedAt: "desc" },
  });
  const passedAttempt = attempts.find((a) => a.passed);
  const submittedAttempts = attempts.filter((a) => a.status !== "IN_PROGRESS");
  const inProgress = attempts.find((a) => a.status === "IN_PROGRESS");

  // Cooldown: count submitted attempts in rolling window
  const cooldownMs = section.quiz.cooldownMinutes ? section.quiz.cooldownMinutes * 60_000 : null;
  const cooldownStart = cooldownMs ? new Date(Date.now() - cooldownMs) : null;
  const submittedInWindow = cooldownStart
    ? submittedAttempts.filter((a) => a.submittedAt && a.submittedAt >= cooldownStart)
    : submittedAttempts;
  // Earliest in window = the one whose expiry frees a slot first
  const earliestInWindow =
    submittedInWindow.length > 0 ? submittedInWindow[submittedInWindow.length - 1] : null;
  const nextAvailableAt =
    cooldownMs && earliestInWindow?.submittedAt && submittedInWindow.length >= section.quiz.maxAttempts
      ? new Date(earliestInWindow.submittedAt.getTime() + cooldownMs)
      : null;

  // Randomize once per render — section quiz, ok to randomize each visit
  const questions = section.quiz.randomize
    ? shuffle(section.quiz.questions).map((q) => ({
        ...q,
        choices: q.type === "MCQ" ? shuffle(q.choices) : q.choices,
      }))
    : section.quiz.questions;

  const remainingAttempts = Math.max(0, section.quiz.maxAttempts - submittedInWindow.length);
  const canStart = !passedAttempt && (remainingAttempts > 0 || inProgress);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href={`/courses/${slug}/learn`} className="text-xs text-muted-foreground hover:underline">
            ← Kembali ke {course.title}
          </Link>
          <h1 className="text-xl font-bold tracking-tight mt-1">Quiz Section: {section.title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline">
              <FontAwesomeIcon icon={faClipboardQuestion} className="mr-1 h-2.5 w-2.5" />
              {questions.length} soal
            </Badge>
            <Badge variant="outline">Lulus ≥ {section.quiz.minScore}%</Badge>
            <Badge variant="outline">
              {remainingAttempts}/{section.quiz.maxAttempts} percobaan tersisa
            </Badge>
          </div>
        </div>
      </div>

      {passedAttempt ? (
        <Card>
          <CardContent className="p-6 space-y-3 text-center">
            <FontAwesomeIcon icon={faCircleCheck} className="h-10 w-10 text-emerald-500 mx-auto" />
            <h2 className="text-lg font-bold">Quiz section ini sudah lulus</h2>
            <p className="text-sm text-muted-foreground">
              Skor terakhir: <strong>{passedAttempt.score}%</strong> ·{" "}
              {formatDate(passedAttempt.submittedAt ?? passedAttempt.startedAt)}
            </p>
            <Button asChild>
              <Link href={`/courses/${slug}/learn`}>Lanjut ke section berikutnya</Link>
            </Button>
          </CardContent>
        </Card>
      ) : canStart ? (
        <QuizRunner
          quizId={section.quiz.id}
          courseSlug={slug}
          minScore={section.quiz.minScore}
          questions={questions.map((q) => ({
            id: q.id,
            type: q.type,
            text: q.text,
            choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
          }))}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-amber-500 flex items-center gap-2">
              <FontAwesomeIcon icon={faCircleXmark} /> Percobaan habis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              Kamu sudah memakai semua percobaan ({section.quiz.maxAttempts}) dalam jendela waktu ini dan
              belum lulus quiz.
            </p>
            {nextAvailableAt ? (
              <CooldownCounter target={nextAvailableAt.toISOString()} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Hubungi admin lab untuk reset percobaan.
              </p>
            )}
            <Button asChild variant="outline">
              <Link href={`/courses/${slug}/learn`}>Kembali</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {submittedAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Riwayat percobaan</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {submittedAttempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                <div className="text-xs text-muted-foreground">
                  {formatDate(a.submittedAt ?? a.startedAt)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{a.score ?? 0}%</span>
                  {a.passed ? <Badge variant="success">Lulus</Badge> : <Badge variant="destructive">Tidak lulus</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
