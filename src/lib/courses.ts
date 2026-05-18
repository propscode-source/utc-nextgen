import { prisma } from "@/lib/prisma";

/**
 * For a given user and course, return:
 *  - sections in order with their lesson list and quiz info
 *  - lessonProgress (set of completed lesson ids)
 *  - sectionPassed (set of section ids whose section quiz the user has passed)
 *  - unlockedSectionIds (set of section ids the user can access right now)
 *  - progressPct (0-100)
 *
 * Section unlock rule:
 *   - First section: always unlocked once enrolled
 *   - Subsequent section: unlocked iff previous section quiz is passed
 *     (or previous section has no quiz — defensive fallback)
 */
export async function getCourseProgressForUser(courseId: string, userId: string) {
  const sections = await prisma.section.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: {
      lessons: { orderBy: { order: "asc" } },
      quiz: { include: { _count: { select: { questions: true } } } },
    },
  });

  const allLessonIds = sections.flatMap((s) => s.lessons.map((l) => l.id));
  const sectionQuizIds = sections.map((s) => s.quiz?.id).filter((x): x is string => !!x);

  const [lessonProgress, passedAttempts] = await Promise.all([
    allLessonIds.length === 0
      ? Promise.resolve([])
      : prisma.lessonProgress.findMany({
          where: { userId, lessonId: { in: allLessonIds } },
          select: { lessonId: true },
        }),
    sectionQuizIds.length === 0
      ? Promise.resolve([])
      : prisma.quizAttempt.findMany({
          where: { userId, quizId: { in: sectionQuizIds }, passed: true },
          select: { quizId: true },
          distinct: ["quizId"],
        }),
  ]);

  const completedLessonIds = new Set(lessonProgress.map((l) => l.lessonId));
  const passedQuizIds = new Set(passedAttempts.map((a) => a.quizId));

  const sectionPassed = new Set<string>();
  for (const s of sections) {
    if (s.quiz && passedQuizIds.has(s.quiz.id)) sectionPassed.add(s.id);
  }

  // Compute unlocked sections
  const unlockedSectionIds = new Set<string>();
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (i === 0) {
      unlockedSectionIds.add(s.id);
    } else {
      const prev = sections[i - 1];
      const prevPassed = !prev.quiz || sectionPassed.has(prev.id);
      if (prevPassed) unlockedSectionIds.add(s.id);
      else break;
    }
  }

  // Progress % — weight: lessons 70%, section quizzes passed 30%
  const totalLessons = allLessonIds.length;
  const totalQuizzes = sectionQuizIds.length;
  const lessonScore = totalLessons === 0 ? 0 : (completedLessonIds.size / totalLessons) * 70;
  const quizScore = totalQuizzes === 0 ? 0 : (sectionPassed.size / totalQuizzes) * 30;
  const progressPct = Math.round(lessonScore + quizScore);

  const fullyDone =
    totalLessons > 0 &&
    completedLessonIds.size === totalLessons &&
    (totalQuizzes === 0 || sectionPassed.size === totalQuizzes);

  return {
    sections,
    completedLessonIds,
    sectionPassed,
    unlockedSectionIds,
    progressPct,
    fullyDone,
  };
}

/** True if the user is enrolled in this course. */
export async function isEnrolled(userId: string, courseId: string) {
  const e = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  return !!e;
}
