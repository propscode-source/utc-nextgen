import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RedemptionsTable, type RedemptionRow } from "./redemptions-table";
import type { RedemptionStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Kelola Penukaran" };

const STATUS_OPTIONS: RedemptionStatus[] = [
  "PENDING",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu",
  PROCESSING: "Diproses",
  READY_FOR_PICKUP: "Siap diambil",
  SHIPPED: "Dikirim",
  DELIVERED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export default async function AdminRedemptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    redirect("/dashboard");
  }

  const { status: statusFilter } = await searchParams;
  const where =
    statusFilter && STATUS_OPTIONS.includes(statusFilter as RedemptionStatus)
      ? { status: statusFilter as RedemptionStatus }
      : {};

  const [redemptions, counts] = await Promise.all([
    prisma.merchRedemption.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, nim: true } },
        merchItem: { select: { id: true, name: true, kind: true } },
      },
      orderBy: { redeemedAt: "desc" },
      take: 200,
    }),
    prisma.merchRedemption.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const totalAll = counts.reduce((s, c) => s + c._count._all, 0);

  const rows: RedemptionRow[] = redemptions.map((r) => ({
    id: r.id,
    pickupCode: r.pickupCode,
    redeemedAt: r.redeemedAt,
    status: r.status,
    deliveryMethod: r.deliveryMethod,
    deliveryAddress: r.deliveryAddress,
    deliveryNotes: r.deliveryNotes,
    voucherCode: r.voucherCode,
    trackingNumber: r.trackingNumber,
    adminNotes: r.adminNotes,
    pointsSpent: r.pointsSpent,
    user: r.user,
    merchItem: r.merchItem,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Penukaran</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update status pengiriman, kirim kode voucher digital, atau refund poin user.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/admin/redemptions"
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
            !statusFilter ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
          }`}
        >
          Semua <span className="opacity-70">({totalAll})</span>
        </Link>
        {STATUS_OPTIONS.map((s) => (
          <Link
            key={s}
            href={`/admin/redemptions?status=${s}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
            }`}
          >
            {STATUS_LABEL[s]} <span className="opacity-70">({countMap[s] ?? 0})</span>
          </Link>
        ))}
      </div>

      <RedemptionsTable
        redemptions={rows}
        canRefund={session.user.role === "SUPERADMIN"}
      />
    </div>
  );
}
