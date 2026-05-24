"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCertificate, faExternalLink, faPrint, faPaintbrush, faRocket } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";

export type CourseRow = {
  id: string;
  slug: string;
  title: string;
  lab: { name: string; slug: string };
  certificateCount: number;
  hasCustomTemplate: boolean;
};

export type IssuedCertRow = {
  id: string;
  certNumber: string;
  issuedAt: string | Date;
  user: { name: string; email: string; nim: string | null };
  course: { id: string; slug: string; title: string; lab: { name: string; slug: string } };
};

export function CourseManagementTable({ courses }: { courses: CourseRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      `${c.title} ${c.lab.name}`.toLowerCase().includes(q)
    );
  }, [courses, query]);

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
                <TableHead>Course</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead className="text-right">Diterbitkan</TableHead>
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    {query
                      ? `Tidak ada course yang cocok dengan "${query}".`
                      : "Tidak ada course di scope kamu."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.lab.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-[10px]">
                        <FontAwesomeIcon icon={faCertificate} className="mr-1 h-2.5 w-2.5" />
                        {c.certificateCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.hasCustomTemplate ? (
                        <Badge variant="success" className="text-[10px]">Custom</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Default</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/labs/${c.lab.slug}/courses/${c.id}/edit/certificates/template`}>
                          <FontAwesomeIcon icon={faPaintbrush} /> Template
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/labs/${c.lab.slug}/courses/${c.id}/edit/certificates`}>
                          <FontAwesomeIcon icon={faRocket} /> Backfill
                        </Link>
                      </Button>
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

export function IssuedCertsTable({ certs }: { certs: IssuedCertRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return certs;
    return certs.filter((c) =>
      `${c.certNumber} ${c.user.name} ${c.user.email} ${c.user.nim ?? ""} ${c.course.title} ${c.course.lab.name}`
        .toLowerCase()
        .includes(q)
    );
  }, [certs, query]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h2 className="text-base font-semibold">Sertifikat terbit ({certs.length})</h2>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari nomor, mahasiswa, atau course..."
            containerClassName="w-full sm:ml-auto sm:w-64 md:w-80"
          />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor</TableHead>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>Course / Lab</TableHead>
                <TableHead>Diterbitkan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    {query
                      ? `Tidak ada sertifikat yang cocok dengan "${query}".`
                      : "Belum ada sertifikat."}
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
                      <div className="text-[10px] text-muted-foreground">
                        {c.user.nim ? `${c.user.nim} · ` : ""}
                        {c.user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{c.course.title}</div>
                      <div className="text-[10px] text-muted-foreground">{c.course.lab.name}</div>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(c.issuedAt)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/certificates/${encodeURIComponent(c.certNumber)}`} target="_blank">
                          <FontAwesomeIcon icon={faPrint} /> Cetak
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/cert/${encodeURIComponent(c.certNumber)}`} target="_blank">
                          <FontAwesomeIcon icon={faExternalLink} /> Verify
                        </Link>
                      </Button>
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
