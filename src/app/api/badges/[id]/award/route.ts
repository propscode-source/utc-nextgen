import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/perms";
import { z } from "zod";

const schema = z.object({
  identifier: z.string().min(3).max(120), // email or NIM
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperadmin(session.user.role)) {
    return NextResponse.json({ error: "Hanya superadmin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const badge = await prisma.badge.findUnique({ where: { id } });
  if (!badge) return NextResponse.json({ error: "Badge tidak ditemukan." }, { status: 404 });

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: parsed.data.identifier }, { nim: parsed.data.identifier }] },
    select: { id: true, name: true },
  });
  if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

  try {
    await prisma.userBadge.create({ data: { userId: user.id, badgeId: id } });
  } catch {
    return NextResponse.json({ error: `${user.name} sudah punya badge ini.` }, { status: 409 });
  }

  return NextResponse.json({ ok: true, name: user.name });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperadmin(session.user.role)) {
    return NextResponse.json({ error: "Hanya superadmin." }, { status: 403 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId wajib." }, { status: 400 });

  await prisma.userBadge
    .delete({ where: { userId_badgeId: { userId, badgeId: id } } })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
