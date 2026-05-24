import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EventStatus } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(3).max(180).optional(),
  description: z.string().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  attendanceOpensAt: z.string().nullable().optional(),
  attendanceClosesAt: z.string().nullable().optional(),
  attendanceCode: z.string().nullable().optional(),
  pointReward: z.number().int().min(0).max(10_000).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  isPublic: z.boolean().optional(),
  labId: z.string().nullable().optional(),
});

function canManageEvents(role: string) {
  return role === "SUPERADMIN" || role === "LAB_ADMIN";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageEvents(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });
  }
  const d = parsed.data;

  // Validate dates if either is being updated.
  let startsAt: Date | undefined;
  let endsAt: Date | undefined;
  if (d.startsAt) {
    startsAt = new Date(d.startsAt);
    if (isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "Tanggal mulai tidak valid." }, { status: 400 });
    }
  }
  if (d.endsAt) {
    endsAt = new Date(d.endsAt);
    if (isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: "Tanggal selesai tidak valid." }, { status: 400 });
    }
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    return NextResponse.json({ error: "Waktu selesai harus setelah waktu mulai." }, { status: 400 });
  }

  await prisma.event.update({
    where: { id },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.description !== undefined && { description: d.description ?? null }),
      ...(d.posterUrl !== undefined && { posterUrl: d.posterUrl || null }),
      ...(d.location !== undefined && { location: d.location ?? null }),
      ...(startsAt && { startsAt }),
      ...(endsAt && { endsAt }),
      ...(d.attendanceOpensAt !== undefined && {
        attendanceOpensAt: d.attendanceOpensAt ? new Date(d.attendanceOpensAt) : null,
      }),
      ...(d.attendanceClosesAt !== undefined && {
        attendanceClosesAt: d.attendanceClosesAt ? new Date(d.attendanceClosesAt) : null,
      }),
      ...(d.attendanceCode !== undefined && { attendanceCode: d.attendanceCode ?? null }),
      ...(d.pointReward !== undefined && { pointReward: d.pointReward }),
      ...(d.status !== undefined && { status: d.status }),
      ...(d.isPublic !== undefined && { isPublic: d.isPublic }),
      ...(d.labId !== undefined && { labId: d.labId || null }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageEvents(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  // Refuse delete on finalized events to preserve points-audit trail.
  const ev = await prisma.event.findUnique({
    where: { id },
    select: { finalizedAt: true, _count: { select: { attendances: true } } },
  });
  if (!ev) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  if (ev.finalizedAt) {
    return NextResponse.json(
      { error: "Event sudah difinalisasi. Batalkan saja (status CANCELLED)." },
      { status: 400 }
    );
  }
  if (ev._count.attendances > 0) {
    return NextResponse.json(
      { error: "Sudah ada presensi tercatat. Hapus presensi atau batalkan event." },
      { status: 400 }
    );
  }

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
