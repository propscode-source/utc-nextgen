import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RedemptionRowActions } from "./redemption-row-actions";
import { formatDate, formatPoints } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTicket, faGift, faStore, faTruck, faBoxArchive } from "@fortawesome/free-solid-svg-icons";
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

const STATUS_VARIANTS: Record<string, "outline" | "info" | "success" | "destructive" | "warning"> = {
  PENDING: "warning",
  PROCESSING: "info",
  READY_FOR_PICKUP: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

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
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    redirect("/dashboard");
  }

  const { status: statusFilter, q } = await searchParams;
  const where = {
    ...(statusFilter && STATUS_OPTIONS.includes(statusFilter as RedemptionStatus)
      ? { status: statusFilter as RedemptionStatus }
      : {}),
    ...(q
      ? {
          OR: [
            { pickupCode: { contains: q, mode: "insensitive" as const } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { merchItem: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [redemptions, counts] = await Promise.all([
    prisma.merchRedemption.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, nim: true } },
        merchItem: { select: { id: true, name: true, kind: true } },
      },
      orderBy: { redeemedAt: "desc" },
      take: 100,
    }),
    prisma.merchRedemption.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const totalAll = counts.reduce((s, c) => s + c._count._all, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Penukaran</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update status pengiriman, kirim kode voucher digital, atau refund poin user.
        </p>
      </div>

      {/* Status filter chips */}
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode / Item</TableHead>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Voucher / Resi</TableHead>
                <TableHead className="text-right">Poin</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {redemptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    <FontAwesomeIcon icon={faBoxArchive} className="h-8 w-8 mb-2 text-muted-foreground" />
                    <div>Belum ada penukaran.</div>
                  </TableCell>
                </TableRow>
              )}
              {redemptions.map((r) => {
                const isVoucher = r.merchItem.kind === "VOUCHER";
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon
                          icon={isVoucher ? faTicket : faGift}
                          className="h-3 w-3 text-primary shrink-0"
                        />
                        <code className="font-mono text-xs">{r.pickupCode}</code>
                      </div>
                      <div className="font-medium text-sm mt-1">{r.merchItem.name}</div>
                      <div className="text-[10px] text-muted-foreground">{formatDate(r.redeemedAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{r.user.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.user.nim ? `${r.user.nim} · ` : ""}
                        {r.user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <FontAwesomeIcon
                          icon={r.deliveryMethod === "SHIPPED" ? faTruck : faStore}
                          className="h-2.5 w-2.5"
                        />
                        {r.deliveryMethod === "SHIPPED" ? "Kirim" : "Ambil"}
                      </Badge>
                      {r.deliveryAddress && (
                        <div className="text-[10px] text-muted-foreground line-clamp-2 mt-1 max-w-[180px]">
                          {r.deliveryAddress}
                        </div>
                      )}
                      {r.deliveryNotes && (
                        <div className="text-[10px] text-muted-foreground italic mt-1">
                          Note: {r.deliveryNotes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[r.status]} className="text-[10px]">
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isVoucher && r.voucherCode ? (
                        <code className="font-mono text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                          {r.voucherCode}
                        </code>
                      ) : isVoucher ? (
                        <span className="text-[10px] text-amber-600">— belum diisi</span>
                      ) : r.trackingNumber ? (
                        <code className="font-mono text-[10px]">{r.trackingNumber}</code>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                      {formatPoints(r.pointsSpent)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RedemptionRowActions
                        redemption={{
                          id: r.id,
                          status: r.status,
                          voucherCode: r.voucherCode ?? "",
                          trackingNumber: r.trackingNumber ?? "",
                          adminNotes: r.adminNotes ?? "",
                          isVoucher,
                          deliveryMethod: r.deliveryMethod,
                          itemName: r.merchItem.name,
                          userEmail: r.user.email,
                          userName: r.user.name,
                          pickupCode: r.pickupCode,
                        }}
                        canRefund={session.user.role === "SUPERADMIN"}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
