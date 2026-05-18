import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  // Data URL or remote URL. We store it as-is for now; in Phase 6 the proktor dashboard
  // can review snapshots, and a future improvement is to upload to Uploadthing.
  imageUrl: z.string().min(20).max(5_000_000),
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
  if (!examSession.webcamEnabled || examSession.status !== "ACTIVE") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  await prisma.webcamSnapshot.create({
    data: { examSessionId: id, imageUrl: parsed.data.imageUrl },
  });
  return NextResponse.json({ ok: true });
}
