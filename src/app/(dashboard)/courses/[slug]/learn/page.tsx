import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCourseProgressForUser, isEnrolled } from "@/lib/courses";
import { LearnShell } from "./learn-shell";

export default async function CourseLearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { slug } = await params;
  const { lesson: lessonParam } = await searchParams;
  const session = await auth();
  if (!session) return null;

  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, requirePretest: true },
  });
  if (!course) notFound();

  const enrolled = await isEnrolled(session.user.id, course.id);
  if (!enrolled) redirect(`/courses/${slug}`);

  // Pretest gate: if course requires pretest and user hasn't passed it, route to pretest.
  if (course.requirePretest) {
    const pretest = await prisma.quiz.findFirst({
      where: { pretestCourseId: course.id },
      select: { id: true },
    });
    if (pretest) {
      const passedPretest = await prisma.examSession.findFirst({
        where: { quizId: pretest.id, userId: session.user.id, passed: true },
        select: { id: true },
      });
      if (!passedPretest) redirect(`/courses/${slug}/exam/pretest`);
    }
  }

  const progress = await getCourseProgressForUser(course.id, session.user.id);

  // Decide initial lesson: param if unlocked, else first not-completed lesson, else first lesson
  const flatLessons = progress.sections.flatMap((s) =>
    progress.unlockedSectionIds.has(s.id) ? s.lessons.map((l) => ({ ...l, sectionId: s.id })) : []
  );

  let activeLessonId: string | null = null;
  if (lessonParam && flatLessons.some((l) => l.id === lessonParam)) {
    activeLessonId = lessonParam;
  } else {
    const firstNotDone = flatLessons.find((l) => !progress.completedLessonIds.has(l.id));
    activeLessonId = firstNotDone?.id ?? flatLessons[0]?.id ?? null;
  }

  const activeLesson = activeLessonId
    ? await prisma.lesson.findUnique({ where: { id: activeLessonId } })
    : null;

  return (
    <LearnShell
      courseSlug={slug}
      courseTitle={course.title}
      sections={progress.sections.map((s) => ({
        id: s.id,
        title: s.title,
        order: s.order,
        unlocked: progress.unlockedSectionIds.has(s.id),
        sectionPassed: progress.sectionPassed.has(s.id),
        lessons: s.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          completed: progress.completedLessonIds.has(l.id),
        })),
        quiz: s.quiz
          ? {
              id: s.quiz.id,
              minScore: s.quiz.minScore,
              questionCount: s.quiz._count.questions,
              passed: progress.sectionPassed.has(s.id),
            }
          : null,
      }))}
      activeLesson={
        activeLesson
          ? {
              id: activeLesson.id,
              title: activeLesson.title,
              type: activeLesson.type,
              contentText: activeLesson.contentText,
              contentJson: (activeLesson.contentJson as object | null) ?? null,
              contentUrl: activeLesson.contentUrl,
              durationSec: activeLesson.durationSec,
              completed: progress.completedLessonIds.has(activeLesson.id),
            }
          : null
      }
      progressPct={progress.progressPct}
    />
  );
}
