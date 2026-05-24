import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  read: z.boolean(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
  }

  const notif = await prisma.notification.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!notif || notif.userId !== session.user.id) {
    return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id },
    data: { read: parsed.data.read },
  });

  const unread = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });
  return NextResponse.json({ ok: true, unread });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notif = await prisma.notification.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!notif || notif.userId !== session.user.id) {
    return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  }

  await prisma.notification.delete({ where: { id } });
  const unread = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });
  return NextResponse.json({ ok: true, unread });
}
