import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageLab } from "@/lib/perms";
import { z } from "zod";

const addSchema = z.object({
  identifier: z.string().min(3, "Email atau NIM minimal 3 karakter").max(100),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: labId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canManageLab(session.user.id, session.user.role, labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Input tidak valid." }, { status: 400 });
  }
  const { identifier } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { nim: identifier }] },
    select: { id: true, name: true },
  });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  const existing = await prisma.labMember.findUnique({
    where: { labId_userId: { labId, userId: user.id } },
  });
  if (existing) return NextResponse.json({ error: "User sudah jadi anggota." }, { status: 409 });

  await prisma.labMember.create({ data: { labId, userId: user.id } });
  return NextResponse.json({ ok: true, name: user.name });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: labId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canManageLab(session.user.id, session.user.role, labId))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const url = new URL(req.url);
  const memberId = url.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId wajib." }, { status: 400 });

  const m = await prisma.labMember.findUnique({ where: { id: memberId }, select: { labId: true } });
  if (!m || m.labId !== labId) return NextResponse.json({ error: "Anggota tidak ditemukan." }, { status: 404 });

  await prisma.labMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
