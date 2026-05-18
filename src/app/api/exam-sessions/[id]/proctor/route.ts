import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isProctor } from "@/lib/proctor-perms";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["FORCE_END", "EXTEND_TIME", "WARN", "CLEAR_WARN"]),
  extendSeconds: z.number().int().min(30).max(3600).optional(),
  message: z.string().min(1).max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isProctor(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const examSession = await prisma.examSession.findUnique({ where: { id } });
  if (!examSession) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 404 });

  if (parsed.data.action === "FORCE_END") {
    if (examSession.status !== "ACTIVE") {
      return NextResponse.json({ error: "Sesi sudah berakhir." }, { status: 400 });
    }
    await prisma.examSession.update({
      where: { id },
      data: { status: "FORCE_ENDED", submittedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "EXTEND_TIME") {
    if (examSession.status !== "ACTIVE") {
      return NextResponse.json({ error: "Hanya sesi ACTIVE yang bisa diperpanjang." }, { status: 400 });
    }
    const sec = parsed.data.extendSeconds ?? 300;
    const base = examSession.endsAt ?? new Date();
    const newEnds = new Date(Math.max(base.getTime(), Date.now()) + sec * 1000);
    await prisma.examSession.update({
      where: { id },
      data: { endsAt: newEnds, durationSec: examSession.durationSec + sec },
    });
    return NextResponse.json({ ok: true, endsAt: newEnds.toISOString() });
  }

  if (parsed.data.action === "WARN") {
    if (!parsed.data.message?.trim()) {
      return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });
    }
    await prisma.examSession.update({
      where: { id },
      data: {
        proctorMessage: parsed.data.message.trim(),
        proctorMessageAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "CLEAR_WARN") {
    await prisma.examSession.update({
      where: { id },
      data: { proctorMessage: null, proctorMessageAt: null },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
}
