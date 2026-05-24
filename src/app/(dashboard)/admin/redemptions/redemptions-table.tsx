"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { RedemptionRowActions } from "./redemption-row-actions";
import { formatDate, formatPoints } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTicket, faGift, faStore, faTruck, faBoxArchive } from "@fortawesome/free-solid-svg-icons";

export type RedemptionRow = {
  id: string;
  pickupCode: string;
  redeemedAt: string | Date;
  status: "PENDING" | "PROCESSING" | "READY_FOR_PICKUP" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  deliveryMethod: "PICKUP" | "SHIPPED";
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  voucherCode: string | null;
  trackingNumber: string | null;
  adminNotes: string | null;
  pointsSpent: number;
  user: { id: string; name: string; email: string; nim: string | null };
  merchItem: { id: string; name: string; kind: "VOUCHER" | "PHYSICAL" };
};

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

export function RedemptionsTable({
  redemptions,
  canRefund,
}: {
  redemptions: RedemptionRow[];
  canRefund: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return redemptions;
    return redemptions.filter((r) =>
      `${r.pickupCode} ${r.user.name} ${r.user.email} ${r.user.nim ?? ""} ${r.merchItem.name} ${r.voucherCode ?? ""} ${r.trackingNumber ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [redemptions, query]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari kode, mahasiswa, item, atau resi..."
            containerClassName="w-full sm:w-64 md:w-80"
          />
        </div>

        <div className="rounded-md border overflow-x-auto">
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    <FontAwesomeIcon icon={faBoxArchive} className="h-8 w-8 mb-2 text-muted-foreground" />
                    <div>
                      {query
                        ? `Tidak ada penukaran yang cocok dengan "${query}".`
                        : "Belum ada penukaran."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
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
                          canRefund={canRefund}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
