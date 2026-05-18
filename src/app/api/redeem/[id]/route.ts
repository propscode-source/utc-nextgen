import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/points";
import { PointEvent, DeliveryMethod } from "@prisma/client";
import { z } from "zod";
import { randomBytes } from "crypto";

const schema = z.object({
  deliveryMethod: z.nativeEnum(DeliveryMethod).default(DeliveryMethod.PICKUP),
  deliveryAddress: z.string().max(1000).optional().nullable(),
  deliveryNotes: z.string().max(500).optional().nullable(),
});

/** UTC-RDM-XXXXXXXX — readable, prefixed, 8 hex chars (~32 bits of entropy). */
function generatePickupCode(): string {
  const hex = randomBytes(4).toString("hex").toUpperCase();
  return `UTC-RDM-${hex}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Input tidak valid." }, { status: 400 });

  const { deliveryMethod, deliveryAddress, deliveryNotes } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.merchItem.findUnique({ where: { id } });
      if (!item) throw new Error("ITEM_NOT_FOUND");
      if (!item.active) throw new Error("ITEM_INACTIVE");
      if (item.stock === 0) throw new Error("OUT_OF_STOCK");

      // Voucher items are always digital — force PICKUP method (no shipping).
      const finalMethod = item.kind === "VOUCHER" ? DeliveryMethod.PICKUP : deliveryMethod;
      if (finalMethod === DeliveryMethod.SHIPPED && !deliveryAddress?.trim()) {
        throw new Error("ADDRESS_REQUIRED");
      }

      const user = await tx.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { points: true },
      });
      if (user.points < item.pointPrice) throw new Error("INSUFFICIENT_POINTS");

      if (item.stock > 0) {
        await tx.merchItem.update({
          where: { id },
          data: { stock: { decrement: 1 } },
        });
      }

      // Deduct points via ledger and award helper.
      await awardPoints({
        userId: session.user.id,
        event: PointEvent.MERCH_REDEEM,
        delta: -item.pointPrice,
        reason: `Tukar ${item.name}`,
        refType: "merch",
        refId: item.id,
        tx,
      });

      // Generate a unique pickup code (extremely unlikely collision; loop just in case).
      let pickupCode = generatePickupCode();
      for (let i = 0; i < 5; i++) {
        const dup = await tx.merchRedemption.findUnique({ where: { pickupCode } });
        if (!dup) break;
        pickupCode = generatePickupCode();
      }

      const redemption = await tx.merchRedemption.create({
        data: {
          userId: session.user.id,
          merchItemId: id,
          pointsSpent: item.pointPrice,
          pickupCode,
          deliveryMethod: finalMethod,
          deliveryAddress: finalMethod === DeliveryMethod.SHIPPED ? deliveryAddress : null,
          deliveryNotes: deliveryNotes || null,
          status: "PENDING",
        },
      });

      const refreshedUser = await tx.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { points: true },
      });

      return {
        redemption,
        newPoints: refreshedUser.points,
        itemKind: item.kind,
        itemName: item.name,
      };
    });

    return NextResponse.json({
      ok: true,
      redemptionId: result.redemption.id,
      pickupCode: result.redemption.pickupCode,
      newPoints: result.newPoints,
      itemKind: result.itemKind,
      itemName: result.itemName,
      deliveryMethod: result.redemption.deliveryMethod,
    });
  } catch (e) {
    const msg = (e as Error).message;
    const map: Record<string, [number, string]> = {
      ITEM_NOT_FOUND: [404, "Merchandise tidak ditemukan."],
      ITEM_INACTIVE: [400, "Merchandise sedang non-aktif."],
      OUT_OF_STOCK: [400, "Stok habis."],
      INSUFFICIENT_POINTS: [400, "Poin kamu tidak cukup."],
      ADDRESS_REQUIRED: [400, "Alamat pengiriman wajib diisi untuk metode kirim."],
    };
    const [status, message] = map[msg] ?? [500, "Gagal menukar."];
    return NextResponse.json({ error: message }, { status });
  }
}
