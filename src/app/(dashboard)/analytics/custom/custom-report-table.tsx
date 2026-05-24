"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { formatDate } from "@/lib/utils";

type CellValue = string | number | boolean | Date | null | undefined;

export function CustomReportTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: CellValue[][];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r
        .map((c) => (c instanceof Date ? formatDate(c) : String(c ?? "")))
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, query]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4 overflow-x-auto">
        <div className="flex justify-end">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari dalam hasil..."
            containerClassName="w-full sm:w-64 md:w-80"
          />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headers.length} className="py-8 text-center text-sm text-muted-foreground">
                    {query
                      ? `Tidak ada baris yang cocok dengan "${query}".`
                      : "Tidak ada baris sesuai parameter."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j} className="text-xs">
                        {cell instanceof Date ? (
                          <Badge variant="outline" className="text-[10px]">{formatDate(cell)}</Badge>
                        ) : (
                          String(cell ?? "—")
                        )}
                      </TableCell>
                    ))}
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
