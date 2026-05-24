"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { AssetRowActions } from "./asset-row-actions";
import { formatPoints } from "@/lib/utils";

export type AssetRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  quantity: number;
  condition: "GOOD" | "NEEDS_REPAIR" | "BROKEN" | "DISPOSED";
  acquiredCost: number | null;
};

const CONDITION_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  GOOD: "success",
  NEEDS_REPAIR: "warning",
  BROKEN: "destructive",
  DISPOSED: "outline",
};

const CONDITION_LABEL: Record<string, string> = {
  GOOD: "Baik",
  NEEDS_REPAIR: "Perlu perbaikan",
  BROKEN: "Rusak",
  DISPOSED: "Dimusnahkan",
};

export function AssetsTable({ assets, canManage }: { assets: AssetRow[]; canManage: boolean }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) =>
      `${a.code} ${a.name} ${a.description ?? ""} ${CONDITION_LABEL[a.condition]}`.toLowerCase().includes(q)
    );
  }, [assets, query]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari kode, nama, atau kondisi..."
            containerClassName="w-full sm:w-64 md:w-80"
          />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama aset</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead className="text-right">Harga satuan</TableHead>
                {canManage && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-sm text-muted-foreground py-8">
                    {query
                      ? `Tidak ada aset yang cocok dengan "${query}".`
                      : "Belum ada aset."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{a.name}</div>
                      {a.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{a.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{a.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={CONDITION_VARIANT[a.condition]}>{CONDITION_LABEL[a.condition]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {a.acquiredCost ? `Rp ${formatPoints(a.acquiredCost)}` : "—"}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <AssetRowActions
                          asset={{
                            id: a.id,
                            name: a.name,
                            code: a.code,
                            quantity: a.quantity,
                            condition: a.condition,
                            acquiredCost: a.acquiredCost ?? 0,
                            description: a.description ?? "",
                          }}
                        />
                      </TableCell>
                    )}
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
