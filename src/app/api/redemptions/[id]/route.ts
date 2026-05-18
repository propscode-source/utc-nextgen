import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RedemptionStatus } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  status: z.nativeEnum(RedemptionStatus).optional(),
  voucherCode: z.string().min(1).max(200).nullable().optional(),
  trackingNumber: z.string().min(1).max(120).nullable().optional(),
  adminNotes: z.string().max(2000).nullable().optional(),
  // when set true, server stamps voucherSentAt = now()
  markVoucherSent: z.boolean().optional(),
});

function canManageRedemptions(role: string) {
  return role === "SUPERADMIN" || role === "LAB_ADMIN";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageRedemptions(session.user.role)) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const data = parsed.data;
  const updated = await prisma.merchRedemption.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.voucherCode !== undefined && { voucherCode: data.voucherCode }),
      ...(data.trackingNumber !== undefined && { trackingNumber: data.trackingNumber }),
      ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
      ...(data.markVoucherSent && { voucherSentAt: new Date() }),
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Refund: cancel redemption and restore points/stock. Superadmin only.
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Hanya superadmin." }, { status: 403 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  if (action !== "refund") {
    return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.merchRedemption.findUnique({
        where: { id },
        include: { merchItem: { select: { stock: true } } },
      });
      if (!r) throw new Error("NOT_FOUND");
      if (r.status === "CANCELLED") throw new Error("ALREADY_CANCELLED");
      if (r.status === "DELIVERED") throw new Error("ALREADY_DELIVERED");

      // Restore points
      await tx.pointsLedger.create({
        data: {
          userId: r.userId,
          event: "ADMIN_ADJUST",
          delta: r.pointsSpent,
          reason: `Refund penukaran ${r.pickupCode}`,
          refType: "redemption",
          refId: r.id,
        },
      });
      await tx.user.update({
        where: { id: r.userId },
        data: { points: { increment: r.pointsSpent } },
      });
      // Restore stock if not unlimited
      if (r.merchItem.stock >= 0) {
        await tx.merchItem.update({
          where: { id: r.merchItemId },
          data: { stock: { increment: 1 } },
        });
      }
      await tx.merchRedemption.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    });
  } catch (e) {
    const msg = (e as Error).message;
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Penukaran tidak ditemukan."],
      ALREADY_CANCELLED: [400, "Sudah dibatalkan."],
      ALREADY_DELIVERED: [400, "Sudah selesai, tidak bisa direfund otomatis."],
    };
    const [status, message] = map[msg] ?? [500, "Gagal refund."];
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ ok: true });
}
