import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isProctor } from "@/lib/proctor-perms";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isProctor(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "active"; // active | recent | all

  const where =
    scope === "active"
      ? { status: "ACTIVE" as const }
      : scope === "recent"
        ? {}
        : {};

  const sessions = await prisma.examSession.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, nim: true, image: true } },
      quiz: {
        select: {
          id: true,
          title: true,
          kind: true,
          minScore: true,
          pretestCourse: { select: { title: true, slug: true } },
          finalCourse: { select: { title: true, slug: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    take: scope === "active" ? 100 : 50,
  });

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      status: s.status,
      startedAt: s.startedAt?.toISOString() ?? null,
      endsAt: s.endsAt?.toISOString() ?? null,
      submittedAt: s.submittedAt?.toISOString() ?? null,
      durationSec: s.durationSec,
      violationCount: s.violationCount,
      maxViolations: s.maxViolations,
      score: s.score,
      passed: s.passed,
      user: s.user,
      quiz: {
        id: s.quiz.id,
        title: s.quiz.title,
        kind: s.quiz.kind,
        course:
          s.quiz.pretestCourse ?? s.quiz.finalCourse ?? null,
      },
    })),
  });
}
