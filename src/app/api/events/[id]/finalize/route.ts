import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PointEvent } from "@prisma/client";
import { awardPoints } from "@/lib/points";
import { notifyUsers } from "@/lib/notifications";

function canFinalize(role: string) {
  return role === "SUPERADMIN" || role === "LAB_ADMIN";
}

/**
 * Finalisasi event: untuk semua presensi yang belum diberi poin, tulis ke
 * PointsLedger sebesar Event.pointReward dan stempel awardedAt + pointsAwarded.
 * Operasi idempoten — boleh dipanggil dua kali; presensi yang sudah diberi poin
 * (awardedAt != null) di-skip.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canFinalize(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const ev = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, slug: true, pointReward: true, status: true, finalizedAt: true },
  });
  if (!ev) return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
  if (ev.status === "CANCELLED") {
    return NextResponse.json({ error: "Event dibatalkan." }, { status: 400 });
  }

  // Pull pending attendances (not yet awarded).
  const pending = await prisma.eventAttendance.findMany({
    where: { eventId, awardedAt: null },
    select: { id: true, userId: true },
  });

  let awarded = 0;
  if (ev.pointReward > 0) {
    for (const a of pending) {
      await prisma.$transaction(async (tx) => {
        await awardPoints({
          userId: a.userId,
          event: PointEvent.EVENT_ATTENDANCE,
          delta: ev.pointReward,
          reason: `Kehadiran event: ${ev.title}`,
          refType: "event",
          refId: ev.id,
          tx,
        });
        await tx.eventAttendance.update({
          where: { id: a.id },
          data: { pointsAwarded: ev.pointReward, awardedAt: new Date() },
        });
      });
      awarded++;
    }
  } else {
    // Reward 0 → still mark as awarded so UI shows finalisasi selesai.
    if (pending.length > 0) {
      await prisma.eventAttendance.updateMany({
        where: { eventId, awardedAt: null },
        data: { pointsAwarded: 0, awardedAt: new Date() },
      });
    }
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { finalizedAt: new Date(), status: "COMPLETED" },
  });

  // Best-effort notify peserta.
  if (pending.length > 0 && ev.pointReward > 0) {
    notifyUsers(
      pending.map((p) => p.userId),
      {
        title: `+${ev.pointReward} poin dari event "${ev.title}"`,
        body: `Terima kasih sudah hadir. Poin sudah masuk ke saldo Anda.`,
        type: "INFO",
        link: `/events/${ev.slug}`,
      }
    ).catch((e) => console.error("[events] notify failed:", e));
  }

  return NextResponse.json({ ok: true, awarded, totalAttendances: pending.length });
}
