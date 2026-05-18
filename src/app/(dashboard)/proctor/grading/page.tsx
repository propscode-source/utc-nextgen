import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isProctor } from "@/lib/proctor-perms";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GradeForm } from "./grade-form";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Penilaian Essay" };

export default async function GradingPage() {
  const session = await auth();
  if (!session) return null;
  if (!isProctor(session.user.role)) redirect("/dashboard");

  // Pull ungraded essay submissions across exam attempts (PRETEST/FINAL).
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
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Penilaian Essay</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Soal essay dari pretest & final exam yang menunggu penilaian manual.
        </p>
      </div>

      {subs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Tidak ada essay yang menunggu penilaian.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {s.attempt.quiz.kind}
                  </Badge>
                  <span className="text-sm font-medium">{s.attempt.quiz.title}</span>
                  <span className="text-xs text-muted-foreground">
                    · {s.attempt.user.name} ({s.attempt.user.nim ?? s.attempt.user.email})
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {s.attempt.submittedAt ? formatDate(s.attempt.submittedAt) : "—"}
                  </span>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Soal (bobot {s.question.points})
                  </div>
                  <div className="text-sm">{s.question.text}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Jawaban mahasiswa
                  </div>
                  <div className="text-sm whitespace-pre-line">{s.essayText || "(kosong)"}</div>
                </div>
                <GradeForm submissionId={s.id} maxPoints={s.question.points} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
