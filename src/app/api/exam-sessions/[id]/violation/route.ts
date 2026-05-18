import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ViolationType } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  type: z.nativeEnum(ViolationType),
  meta: z.record(z.any()).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const examSession = await prisma.examSession.findUnique({ where: { id } });
  if (!examSession) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });
  if (examSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Bukan sesi kamu." }, { status: 403 });
  }
  if (examSession.status !== "ACTIVE") {
    return NextResponse.json({ ok: true, status: examSession.status, ignored: true });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    await tx.examViolation.create({
      data: {
        examSessionId: id,
        type: parsed.data.type,
        meta: parsed.data.meta ?? undefined,
      },
    });
    const updated = await tx.examSession.update({
      where: { id },
      data: { violationCount: { increment: 1 } },
      select: { violationCount: true, maxViolations: true },
    });
    return updated;
  });

  const exceeded = result.violationCount >= result.maxViolations;
  if (exceeded) {
    // Auto-end session: mark FORCE_ENDED. The submit endpoint will be called by the client
    // immediately after with whatever answers it has so far.
    await prisma.examSession.update({
      where: { id },
      data: { status: "FORCE_ENDED", submittedAt: new Date() },
    });
  }

  return NextResponse.json({
    ok: true,
    violationCount: result.violationCount,
    maxViolations: result.maxViolations,
    forceEnded: exceeded,
  });
}
