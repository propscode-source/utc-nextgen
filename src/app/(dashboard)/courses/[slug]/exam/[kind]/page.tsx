import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isEnrolled } from "@/lib/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExamRunner } from "./exam-runner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleXmark,
  faClipboardQuestion,
  faShieldHalved,
  faStopwatch,
  faVideo,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";

type Kind = "pretest" | "final";

function shuffle<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

export default async function ExamPage({
  params,
}: {
  params: Promise<{ slug: string; kind: string }>;
}) {
  const { slug, kind: rawKind } = await params;
  const kind = rawKind as Kind;
  if (kind !== "pretest" && kind !== "final") notFound();

  const session = await auth();
  if (!session) return null;

  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, title: true, slug: true, requirePretest: true, passScore: true },
  });
  if (!course) notFound();

  const enrolled = await isEnrolled(session.user.id, course.id);
  if (!enrolled) redirect(`/courses/${slug}`);

  const quiz = await prisma.quiz.findFirst({
    where:
      kind === "pretest"
        ? { pretestCourseId: course.id }
        : { finalCourseId: course.id },
    include: {
      questions: { orderBy: { order: "asc" }, include: { choices: { orderBy: { order: "asc" } } } },
    },
  });

  if (!quiz) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <FontAwesomeIcon icon={faCircleXmark} className="h-8 w-8 text-amber-500" />
          <p className="text-sm">
            {kind === "pretest"
              ? "Course ini belum punya pretest."
              : "Course ini belum punya final exam."}
          </p>
          <Button asChild variant="outline">
            <Link href={`/courses/${slug}`}>Kembali ke detail course</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Already-passed lookup uses ExamSession.
  const passed = await prisma.examSession.findFirst({
    where: { quizId: quiz.id, userId: session.user.id, passed: true },
    orderBy: { submittedAt: "desc" },
  });

  const sessions = await prisma.examSession.findMany({
    where: { quizId: quiz.id, userId: session.user.id },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  // Cooldown check (mirrors API logic) — only for display.
  const submittedSessions = sessions.filter((s) => s.status !== "ACTIVE");
  const cooldownMs = quiz.cooldownMinutes ? quiz.cooldownMinutes * 60_000 : null;
  const cooldownStart = cooldownMs ? new Date(Date.now() - cooldownMs) : null;
  const submittedInWindow = cooldownStart
    ? submittedSessions.filter((s) => s.submittedAt && s.submittedAt >= cooldownStart)
    : submittedSessions;
  const remaining = Math.max(0, quiz.maxAttempts - submittedInWindow.length);
  const canStart = !passed && remaining > 0;

  const questions = quiz.randomize
    ? shuffle(quiz.questions).map((q) => ({
        ...q,
        choices: q.type === "MCQ" ? shuffle(q.choices) : q.choices,
      }))
    : quiz.questions;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <Link href={`/courses/${slug}`} className="text-xs text-muted-foreground hover:underline">
          ← Kembali ke {course.title}
        </Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight">
          {kind === "pretest" ? "Pretest" : "Final Exam"}: {course.title}
        </h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge variant="outline">
            <FontAwesomeIcon icon={faClipboardQuestion} className="mr-1 h-2.5 w-2.5" />
            {questions.length} soal
          </Badge>
          {quiz.timerSec ? (
            <Badge variant="outline">
              <FontAwesomeIcon icon={faStopwatch} className="mr-1 h-2.5 w-2.5" />
              {Math.round(quiz.timerSec / 60)} menit
            </Badge>
          ) : null}
          <Badge variant="outline">Lulus ≥ {quiz.minScore}%</Badge>
          <Badge variant="outline">
            {remaining}/{quiz.maxAttempts} percobaan tersisa
          </Badge>
          {quiz.webcamEnabled && (
            <Badge variant="warning">
              <FontAwesomeIcon icon={faVideo} className="mr-1 h-2.5 w-2.5" />
              Webcam aktif
            </Badge>
          )}
        </div>
      </div>

      {passed ? (
        <Card>
          <CardContent className="p-6 space-y-3 text-center">
            <FontAwesomeIcon icon={faCircleCheck} className="h-10 w-10 text-emerald-500 mx-auto" />
            <h2 className="text-lg font-bold">Sudah lulus</h2>
            <p className="text-sm text-muted-foreground">
              Skor terakhir: <strong>{passed.score}%</strong> ·{" "}
              {formatDate(passed.submittedAt ?? passed.startedAt ?? passed.createdAt)}
            </p>
            <Button asChild>
              <Link href={`/courses/${slug}/learn`}>Lanjut belajar</Link>
            </Button>
          </CardContent>
        </Card>
      ) : canStart ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FontAwesomeIcon icon={faShieldHalved} className="text-amber-500" />
                Aturan ujian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>Halaman akan masuk <strong>fullscreen</strong> saat ujian dimulai.</li>
                <li>
                  <strong>Keluar fullscreen</strong> atau pindah tab/window akan tercatat sebagai pelanggaran.
                </li>
                <li>
                  Copy-paste dan klik kanan diblokir. Setiap percobaan dianggap pelanggaran.
                </li>
                <li>
                  Maksimum <strong>{quiz.maxViolations} pelanggaran</strong> — sesi akan otomatis berakhir &
                  jawaban di-submit otomatis bila terlampaui.
                </li>
                {quiz.timerSec && (
                  <li>
                    Timer <strong>{Math.round(quiz.timerSec / 60)} menit</strong> — saat habis, jawaban
                    di-submit otomatis.
                  </li>
                )}
                {quiz.webcamEnabled && (
                  <li>
                    Webcam akan diambil snapshot setiap{" "}
                    <strong>{quiz.webcamIntervalSec} detik</strong>. Pastikan webcam aktif.
                  </li>
                )}
              </ul>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-2 flex items-center gap-1">
                <FontAwesomeIcon icon={faTriangleExclamation} className="h-3 w-3" />
                Pastikan internet stabil. Sesi yang force-end karena pelanggaran tetap dihitung sebagai
                percobaan.
              </p>
            </CardContent>
          </Card>

          <ExamRunner
            quizId={quiz.id}
            courseSlug={slug}
            kind={kind}
            minScore={quiz.minScore}
            timerSec={quiz.timerSec}
            webcamEnabled={quiz.webcamEnabled}
            webcamIntervalSec={quiz.webcamIntervalSec}
            maxViolations={quiz.maxViolations}
            questions={questions.map((q) => ({
              id: q.id,
              type: q.type,
              text: q.text,
              choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
            }))}
          />
        </>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-3 text-center">
            <FontAwesomeIcon icon={faCircleXmark} className="h-8 w-8 text-amber-500" />
            <h2 className="text-base font-semibold">Tidak bisa memulai sekarang</h2>
            <p className="text-sm text-muted-foreground">
              Percobaan habis atau sedang dalam cooldown. Hubungi proktor untuk reset.
            </p>
            <Button asChild variant="outline">
              <Link href={`/courses/${slug}`}>Kembali</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Riwayat sesi ujian</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0 gap-2"
              >
                <div className="text-xs text-muted-foreground">
                  {formatDate(s.submittedAt ?? s.startedAt ?? s.createdAt)}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {s.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {s.violationCount}/{s.maxViolations} pelanggaran
                  </Badge>
                  <span className="font-mono">{s.score ?? 0}%</span>
                  {s.passed ? <Badge variant="success">Lulus</Badge> : <Badge variant="destructive">Tidak lulus</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
