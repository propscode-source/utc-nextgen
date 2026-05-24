"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { MerchRowActions } from "./merch-row-actions";
import { formatDate, formatPoints } from "@/lib/utils";

export type MerchTableItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  kind: "VOUCHER" | "PHYSICAL";
  pointPrice: number;
  stock: number;
  active: boolean;
  createdAt: string | Date;
  redemptionCount: number;
};

export function MerchTable({ items }: { items: MerchTableItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      `${it.name} ${it.slug} ${it.description ?? ""} ${it.kind}`.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari nama, slug, atau deskripsi..."
            containerClassName="w-full sm:w-64 md:w-80"
          />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Penukaran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    {query
                      ? `Tidak ada item yang cocok dengan "${query}".`
                      : "Belum ada merchandise."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
                      )}
                      <div className="text-[10px] font-mono text-muted-foreground mt-1">{item.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.kind === "VOUCHER" ? "info" : "secondary"} className="text-[10px]">
                        {item.kind === "VOUCHER" ? "Voucher" : "Fisik"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="text-amber-500 font-semibold">{formatPoints(item.pointPrice)}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.stock < 0 ? (
                        <Badge variant="outline" className="text-[10px]">∞</Badge>
                      ) : item.stock === 0 ? (
                        <Badge variant="destructive" className="text-[10px]">Habis</Badge>
                      ) : (
                        item.stock
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.redemptionCount}</TableCell>
                    <TableCell>
                      {item.active ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="outline">Non-aktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <MerchRowActions
                        item={{
                          id: item.id,
                          name: item.name,
                          description: item.description ?? "",
                          imageUrl: item.imageUrl ?? "",
                          pointPrice: item.pointPrice,
                          stock: item.stock,
                          active: item.active,
                          kind: item.kind,
                          hasRedemptions: item.redemptionCount > 0,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
