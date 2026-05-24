import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EventStatus } from "@prisma/client";
import { z } from "zod";
import { slugifyEvent } from "@/lib/events";

const createSchema = z.object({
  title: z.string().min(3).max(180),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan dash")
    .optional(),
  description: z.string().max(4000).optional(),
  posterUrl: z.string().optional(),
  location: z.string().max(180).optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  attendanceOpensAt: z.string().nullable().optional(),
  attendanceClosesAt: z.string().nullable().optional(),
  attendanceCode: z.string().max(60).nullable().optional(),
  pointReward: z.number().int().min(0).max(10_000).default(50),
  status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),
  isPublic: z.boolean().default(true),
  labId: z.string().nullable().optional(),
});

function canManageEvents(role: string) {
  return role === "SUPERADMIN" || role === "LAB_ADMIN";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageEvents(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const startsAt = new Date(d.startsAt);
  const endsAt = new Date(d.endsAt);
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
  }
  if (endsAt < startsAt) {
    return NextResponse.json({ error: "Waktu selesai harus setelah waktu mulai." }, { status: 400 });
  }

  let slug = d.slug ?? slugifyEvent(d.title);
  if (!slug) slug = `event-${Date.now()}`;
  const existing = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Slug sudah dipakai." }, { status: 409 });
  }

  const ev = await prisma.event.create({
    data: {
      slug,
      title: d.title,
      description: d.description || null,
      posterUrl: d.posterUrl || null,
      location: d.location || null,
      startsAt,
      endsAt,
      attendanceOpensAt: d.attendanceOpensAt ? new Date(d.attendanceOpensAt) : null,
      attendanceClosesAt: d.attendanceClosesAt ? new Date(d.attendanceClosesAt) : null,
      attendanceCode: d.attendanceCode || null,
      pointReward: d.pointReward,
      status: d.status,
      isPublic: d.isPublic,
      labId: d.labId || null,
      createdById: session.user.id,
    },
  });
  return NextResponse.json({ id: ev.id, slug: ev.slug });
}
