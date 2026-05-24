"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";

export type PerCourseRow = {
  id: string;
  title: string;
  passScore: number;
  lab: { name: string };
  enrollments: number;
  certificates: number;
  completionRate: number;
  examAttempts: number;
  examPassed: number;
  avgScore: number | null;
  violations: number;
};

export function PerCourseTable({ rows }: { rows: PerCourseRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.title} ${r.lab.name}`.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari course atau lab..."
            containerClassName="w-full sm:w-64 md:w-80"
          />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course / Lab</TableHead>
                <TableHead className="text-right">Pass Score</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
                <TableHead className="text-right">Sertifikat</TableHead>
                <TableHead className="text-right">Kelulusan</TableHead>
                <TableHead className="text-right">Final Attempt</TableHead>
                <TableHead className="text-right">Final Lulus</TableHead>
                <TableHead className="text-right">Avg Skor</TableHead>
                <TableHead className="text-right">Pelanggaran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    {query
                      ? `Tidak ada course yang cocok dengan "${query}".`
                      : "Tidak ada course."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{r.title}</div>
                      <div className="text-[10px] text-muted-foreground">{r.lab.name}</div>
                    </TableCell>
                    <TableCell className="text-right text-xs">{r.passScore}%</TableCell>
                    <TableCell className="text-right">{r.enrollments}</TableCell>
                    <TableCell className="text-right">{r.certificates}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.completionRate >= 70 ? "success" : "outline"} className="text-[10px]">
                        {r.completionRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">{r.examAttempts}</TableCell>
                    <TableCell className="text-right text-xs">{r.examPassed}</TableCell>
                    <TableCell className="text-right text-xs">{r.avgScore ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs">{r.violations}</TableCell>
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
