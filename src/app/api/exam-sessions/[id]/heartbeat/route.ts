import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Lightweight student-side polling endpoint. Returns session status, time remaining, proctor warning. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const s = await prisma.examSession.findUnique({
    where: { id },
    select: {
      userId: true,
      status: true,
      endsAt: true,
      violationCount: true,
      maxViolations: true,
      proctorMessage: true,
      proctorMessageAt: true,
    },
  });
  if (!s) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  if (s.userId !== session.user.id) {
    return NextResponse.json({ error: "Bukan sesi kamu." }, { status: 403 });
  }

  const now = Date.now();
  const remainingSec = s.endsAt ? Math.max(0, Math.floor((s.endsAt.getTime() - now) / 1000)) : null;

  return NextResponse.json({
    status: s.status,
    endsAt: s.endsAt?.toISOString() ?? null,
    remainingSec,
    violationCount: s.violationCount,
    maxViolations: s.maxViolations,
    proctorMessage: s.proctorMessage,
    proctorMessageAt: s.proctorMessageAt?.toISOString() ?? null,
  });
}
