import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isAttendanceOpen } from "@/lib/events";

const selfCheckInSchema = z.object({
  // When the event has an attendanceCode, mahasiswa must supply it.
  code: z.string().max(60).optional(),
  note: z.string().max(2000).optional(),
});

const adminMarkSchema = z.object({
  userId: z.string().min(1),
  note: z.string().max(2000).optional(),
});

function canManageAttendance(role: string) {
  return role === "SUPERADMIN" || role === "LAB_ADMIN";
}

/**
 * Two modes via ?mode=
 *   - mode=self (default): the signed-in user marks their own attendance.
 *     Requires correct attendanceCode (if event has one) and an open window.
 *   - mode=admin: admin marks attendance on behalf of `userId`. No code required.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "self";

  const ev = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      attendanceOpensAt: true,
      attendanceClosesAt: true,
      attendanceCode: true,
      finalizedAt: true,
    },
  });
  if (!ev) return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
  if (ev.finalizedAt) {
    return NextResponse.json({ error: "Event sudah difinalisasi." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  if (mode === "admin") {
    if (!canManageAttendance(session.user.role)) {
      return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
    }
    const parsed = adminMarkSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

    const userExists = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true },
    });
    if (!userExists) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

    await prisma.eventAttendance.upsert({
      where: { eventId_userId: { eventId, userId: parsed.data.userId } },
      update: { note: parsed.data.note ?? undefined },
      create: { eventId, userId: parsed.data.userId, note: parsed.data.note },
    });
    return NextResponse.json({ ok: true });
  }

  // mode=self
  const parsed = selfCheckInSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  if (!isAttendanceOpen(ev)) {
    return NextResponse.json(
      { error: "Jendela presensi belum dibuka atau sudah ditutup." },
      { status: 400 }
    );
  }
  if (ev.attendanceCode && ev.attendanceCode !== (parsed.data.code ?? "").trim()) {
    return NextResponse.json({ error: "Kode presensi salah." }, { status: 400 });
  }

  await prisma.eventAttendance.upsert({
    where: { eventId_userId: { eventId, userId: session.user.id } },
    update: { note: parsed.data.note ?? undefined },
    create: { eventId, userId: session.user.id, note: parsed.data.note },
  });
  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ userId: z.string().min(1) });

/** Admin removes an attendance record (e.g. mistaken check-in). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageAttendance(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "userId wajib diisi." }, { status: 400 });

  // Don't allow removing if event already finalized (poin sudah dibagikan, butuh refund manual).
  const ev = await prisma.event.findUnique({
    where: { id: eventId },
    select: { finalizedAt: true },
  });
  if (!ev) return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
  if (ev.finalizedAt) {
    return NextResponse.json(
      { error: "Event sudah difinalisasi — hapus tidak diizinkan." },
      { status: 400 }
    );
  }

  await prisma.eventAttendance.deleteMany({
    where: { eventId, userId: parsed.data.userId },
  });
  return NextResponse.json({ ok: true });
}
