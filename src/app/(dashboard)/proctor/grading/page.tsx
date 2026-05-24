import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isProctor } from "@/lib/proctor-perms";
import { GradingList, type EssaySub } from "./grading-list";

export const metadata: Metadata = { title: "Penilaian Essay" };

export default async function GradingPage() {
  const session = await auth();
  if (!session) return null;
  if (!isProctor(session.user.role)) redirect("/dashboard");

  const subs = await prisma.answerSubmission.findMany({
    where: {
      question: { type: "ESSAY" },
      gradedAt: null,
      attempt: { quiz: { kind: { in: ["PRETEST", "FINAL"] } } },
    },
    include: {
      question: { select: { id: true, text: true, points: true } },
      attempt: {
        select: {
          id: true,
          quizId: true,
          userId: true,
          submittedAt: true,
          quiz: { select: { title: true, kind: true } },
          user: { select: { id: true, name: true, email: true, nim: true } },
        },
      },
    },
    orderBy: [{ attempt: { submittedAt: "desc" } }],
    take: 100,
  });

  const items: EssaySub[] = subs.map((s) => ({
    id: s.id,
    essayText: s.essayText,
    question: s.question,
    attempt: s.attempt,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Penilaian Essay</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Soal essay dari pretest & final exam yang menunggu penilaian manual.
        </p>
      </div>

      <GradingList subs={items} />
    </div>
  );
}
