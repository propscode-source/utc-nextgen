import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { CourseEditor } from "./course-editor";

export default async function CourseEditPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string }>;
}) {
  const { slug, courseId } = await params;
  const session = await auth();
  if (!session) return null;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lab: { select: { id: true, slug: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: { orderBy: { order: "asc" } },
          quiz: { include: { _count: { select: { questions: true } } } },
        },
      },
      pretestQuiz: { include: { _count: { select: { questions: true } } } },
      finalQuiz: { include: { _count: { select: { questions: true } } } },
    },
  });
  if (!course || course.lab.slug !== slug) notFound();
  if (!(await canManageLab(session.user.id, session.user.role, course.lab.id))) {
    redirect(`/labs/${slug}/courses`);
  }

  return (
    <CourseEditor
      labSlug={slug}
      course={{
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description ?? "",
        thumbnailUrl: course.thumbnailUrl ?? "",
        isLocked: course.isLocked,
        pointPrice: course.pointPrice,
        passScore: course.passScore,
        requirePretest: course.requirePretest,
        certNumberPrefix: course.certNumberPrefix ?? "",
        certNumberPattern: course.certNumberPattern ?? "",
      }}
      pretestQuiz={
        course.pretestQuiz
          ? { id: course.pretestQuiz.id, questionCount: course.pretestQuiz._count.questions }
          : null
      }
      finalQuiz={
        course.finalQuiz
          ? { id: course.finalQuiz.id, questionCount: course.finalQuiz._count.questions }
          : null
      }
      sections={course.sections.map((s) => ({
        id: s.id,
        title: s.title,
        order: s.order,
        lessons: s.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          order: l.order,
          type: l.type,
          contentText: l.contentText ?? "",
          contentJson: (l.contentJson as object | null) ?? null,
          contentUrl: l.contentUrl ?? "",
          durationSec: l.durationSec ?? null,
        })),
        quiz: s.quiz
          ? {
              id: s.quiz.id,
              minScore: s.quiz.minScore,
              maxAttempts: s.quiz.maxAttempts,
              questionCount: s.quiz._count.questions,
            }
          : null,
      }))}
    />
  );
}
