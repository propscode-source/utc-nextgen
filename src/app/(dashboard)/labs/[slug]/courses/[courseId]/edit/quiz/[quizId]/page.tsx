import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { QuizQuestionEditor } from "./quiz-question-editor";

export default async function QuizEditorPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string; quizId: string }>;
}) {
  const { slug, courseId, quizId } = await params;
  const session = await auth();
  if (!session) return null;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { choices: { orderBy: { order: "asc" } } },
      },
      section: { include: { course: { include: { lab: { select: { id: true, slug: true } } } } } },
      pretestCourse: { include: { lab: { select: { id: true, slug: true } } } },
      finalCourse: { include: { lab: { select: { id: true, slug: true } } } },
    },
  });
  if (!quiz) notFound();

  // Resolve parent course/lab depending on quiz kind.
  const parentCourse =
    quiz.section?.course ?? quiz.pretestCourse ?? quiz.finalCourse ?? null;
  if (!parentCourse) notFound();
  if (parentCourse.id !== courseId || parentCourse.lab.slug !== slug) notFound();

  if (!(await canManageLab(session.user.id, session.user.role, parentCourse.lab.id))) {
    redirect(`/labs/${slug}/courses`);
  }

  const subtitle =
    quiz.kind === "SECTION"
      ? quiz.section!.title
      : quiz.kind === "PRETEST"
        ? `Pretest — ${quiz.pretestCourse!.title}`
        : `Final Exam — ${quiz.finalCourse!.title}`;

  // Aggregate attempts per user for the reset panel.
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    include: { user: { select: { id: true, name: true, email: true, nim: true } } },
    orderBy: { startedAt: "desc" },
  });
  const byUser = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      nim: string | null;
      total: number;
      submittedInWindow: number;
      passed: boolean;
      lastAt: Date | null;
    }
  >();
  const cooldownMs = quiz.cooldownMinutes ? quiz.cooldownMinutes * 60_000 : null;
  const cooldownStart = cooldownMs ? new Date(Date.now() - cooldownMs) : null;

  for (const a of attempts) {
    const cur =
      byUser.get(a.user.id) ?? {
        userId: a.user.id,
        name: a.user.name,
        email: a.user.email,
        nim: a.user.nim,
        total: 0,
        submittedInWindow: 0,
        passed: false,
        lastAt: null as Date | null,
      };
    cur.total += 1;
    if (a.passed) cur.passed = true;
    if (
      a.status !== "IN_PROGRESS" &&
      (!cooldownStart || (a.submittedAt && a.submittedAt >= cooldownStart))
    ) {
      cur.submittedInWindow += 1;
    }
    if (!cur.lastAt || a.startedAt > cur.lastAt) cur.lastAt = a.startedAt;
    byUser.set(a.user.id, cur);
  }
  const userAttempts = Array.from(byUser.values()).sort(
    (a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0)
  );

  return (
    <QuizQuestionEditor
      labSlug={slug}
      courseId={courseId}
      sectionTitle={subtitle}
      quizKind={quiz.kind}
      quiz={{
        id: quiz.id,
        minScore: quiz.minScore,
        maxAttempts: quiz.maxAttempts,
        timerSec: quiz.timerSec,
        cooldownMinutes: quiz.cooldownMinutes,
        randomize: quiz.randomize,
        webcamEnabled: quiz.webcamEnabled,
        webcamIntervalSec: quiz.webcamIntervalSec,
        maxViolations: quiz.maxViolations,
      }}
      userAttempts={userAttempts.map((u) => ({
        userId: u.userId,
        name: u.name,
        email: u.email,
        nim: u.nim,
        total: u.total,
        submittedInWindow: u.submittedInWindow,
        passed: u.passed,
        lastAt: u.lastAt?.toISOString() ?? null,
      }))}
      questions={quiz.questions.map((q) => ({
        id: q.id,
        type: q.type,
        order: q.order,
        text: q.text,
        points: q.points,
        choices: q.choices.map((c) => ({
          id: c.id,
          text: c.text,
          isCorrect: c.isCorrect,
          order: c.order,
        })),
      }))}
    />
  );
}
