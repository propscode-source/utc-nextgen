import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RedeemButton } from "./redeem-button";
import { formatDate, formatPoints } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGift, faCoins, faBoxesStacked, faTicket, faTruck, faStore as faStoreIcon } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Tukar Poin" };

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

export default async function RedeemPage() {
  const session = await auth();
  if (!session) return null;

  const [items, redemptions] = await Promise.all([
    prisma.merchItem.findMany({
      where: { active: true },
      orderBy: { pointPrice: "asc" },
    }),
    prisma.merchRedemption.findMany({
      where: { userId: session.user.id },
      include: {
        merchItem: { select: { name: true, imageUrl: true, kind: true } },
      },
      orderBy: { redeemedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tukar Poin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tukarkan poin dengan merchandise UTC. Voucher dikirim digital, barang fisik bisa diambil di
            kantor UTC atau dikirim (biaya kirim ditanggung sendiri).
          </p>
        </div>
        <Badge variant="warning" className="text-sm">
          <FontAwesomeIcon icon={faCoins} className="mr-1.5 h-3 w-3" />
          Saldo: {formatPoints(session.user.points)} poin
        </Badge>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <FontAwesomeIcon icon={faGift} className="h-8 w-8 mb-3 text-muted-foreground" />
            <p>Belum ada merchandise yang tersedia.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const outOfStock = item.stock === 0;
            const cantAfford = session.user.points < item.pointPrice;
            return (
              <Card key={item.id} className="flex flex-col">
                <div className="aspect-video bg-muted overflow-hidden rounded-t-xl flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <FontAwesomeIcon
                      icon={item.kind === "VOUCHER" ? faTicket : faGift}
                      className="h-10 w-10 text-muted-foreground"
                    />
                  )}
                </div>
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={item.kind === "VOUCHER" ? "info" : "secondary"} className="text-[10px]">
                      {item.kind === "VOUCHER" ? "Voucher digital" : "Barang fisik"}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                      <FontAwesomeIcon icon={faCoins} className="h-3 w-3" />
                      {formatPoints(item.pointPrice)}
                    </span>
                    {item.stock < 0 ? (
                      <span className="text-muted-foreground">Stok tak terbatas</span>
                    ) : outOfStock ? (
                      <Badge variant="destructive">Habis</Badge>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <FontAwesomeIcon icon={faBoxesStacked} className="h-3 w-3" />
                        {item.stock} stok
                      </span>
                    )}
                  </div>
                  <RedeemButton
                    itemId={item.id}
                    itemName={item.name}
                    itemKind={item.kind}
                    pointPrice={item.pointPrice}
                    disabled={outOfStock || cantAfford}
                    insufficient={cantAfford}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat penukaran</CardTitle>
        </CardHeader>
        <CardContent>
          {redemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada penukaran.</p>
          ) : (
            <ul className="divide-y">
              {redemptions.map((r) => {
                const isVoucher = r.merchItem.kind === "VOUCHER";
                const showVoucher = isVoucher && !!r.voucherCode;
                return (
                  <li key={r.id} className="py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{r.merchItem.name}</span>
                        <Badge variant={STATUS_VARIANTS[r.status]} className="text-[10px]">
                          {STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <FontAwesomeIcon
                            icon={r.deliveryMethod === "SHIPPED" ? faTruck : faStoreIcon}
                            className="h-2.5 w-2.5"
                          />
                          {r.deliveryMethod === "SHIPPED" ? "Dikirim" : "Ambil di kantor"}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDate(r.redeemedAt)} · Kode:{" "}
                        <code className="font-mono text-foreground">{r.pickupCode}</code>
                      </div>
                      {showVoucher && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Kode voucher: </span>
                          <code className="font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                            {r.voucherCode}
                          </code>
                        </div>
                      )}
                      {isVoucher && !r.voucherCode && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400">
                          Menunggu admin mengirim kode voucher.
                        </div>
                      )}
                      {r.deliveryMethod === "SHIPPED" && r.trackingNumber && (
                        <div className="text-[11px]">
                          <span className="text-muted-foreground">Resi: </span>
                          <code className="font-mono">{r.trackingNumber}</code>
                        </div>
                      )}
                      {r.adminNotes && (
                        <div className="text-[11px] text-muted-foreground italic">
                          Catatan admin: {r.adminNotes}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-mono text-destructive shrink-0">
                      -{formatPoints(r.pointsSpent)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
