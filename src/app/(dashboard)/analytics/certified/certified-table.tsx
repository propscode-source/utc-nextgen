"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { formatDate } from "@/lib/utils";

export type CertRow = {
  id: string;
  certNumber: string;
  issuedAt: string | Date;
  user: {
    name: string;
    email: string;
    nim: string | null;
    prodi: string | null;
    angkatan: number | null;
  };
  course: { title: string; lab: { name: string } };
};

export function CertifiedTable({ certs }: { certs: CertRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return certs;
    return certs.filter((c) =>
      `${c.certNumber} ${c.user.name} ${c.user.email} ${c.user.nim ?? ""} ${c.user.prodi ?? ""} ${c.course.title} ${c.course.lab.name}`
        .toLowerCase()
        .includes(q)
    );
  }, [certs, query]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari nomor, mahasiswa, NIM, atau course..."
            containerClassName="w-full sm:w-64 md:w-80"
          />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Sertifikat</TableHead>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>NIM / Prodi</TableHead>
                <TableHead>Course / Lab</TableHead>
                <TableHead>Diterbitkan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    {query
                      ? `Tidak ada sertifikat yang cocok dengan "${query}".`
                      : "Tidak ada sertifikat sesuai filter."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <code className="font-mono text-xs font-bold">{c.certNumber}</code>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{c.user.name}</div>
                      <div className="text-[10px] text-muted-foreground">{c.user.email}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{c.user.nim ?? "—"}</div>
                      <div className="text-muted-foreground">
                        {c.user.prodi ?? "—"} {c.user.angkatan ? `· ${c.user.angkatan}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{c.course.title}</div>
                      <div className="text-[10px] text-muted-foreground">{c.course.lab.name}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {formatDate(c.issuedAt)}
                      </Badge>
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
