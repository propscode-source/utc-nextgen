import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isProctor } from "@/lib/proctor-perms";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isProctor(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const s = await prisma.examSession.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, nim: true, prodi: true, image: true } },
      quiz: {
        select: {
          id: true,
          title: true,
          kind: true,
          minScore: true,
          maxViolations: true,
        },
      },
      violations: { orderBy: { occurredAt: "desc" } },
      snapshots: { orderBy: { capturedAt: "desc" }, take: 24 },
    },
  });
  if (!s) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });

  return NextResponse.json({
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
    proctorMessage: s.proctorMessage,
    proctorMessageAt: s.proctorMessageAt?.toISOString() ?? null,
    user: s.user,
    quiz: s.quiz,
    violations: s.violations.map((v) => ({
      id: v.id,
      type: v.type,
      meta: v.meta,
      occurredAt: v.occurredAt.toISOString(),
    })),
    snapshots: s.snapshots.map((sn) => ({
      id: sn.id,
      imageUrl: sn.imageUrl,
      capturedAt: sn.capturedAt.toISOString(),
    })),
  });
}
