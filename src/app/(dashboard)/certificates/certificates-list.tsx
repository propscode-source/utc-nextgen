"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCertificate, faExternalLink, faPrint } from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "@/lib/utils";

export type CertificateItem = {
  id: string;
  certNumber: string;
  issuedAt: string | Date;
  course: { title: string; slug: string; lab: { name: string } };
};

export function CertificatesList({ certs }: { certs: CertificateItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return certs;
    return certs.filter((c) => {
      const haystack = `${c.course.title} ${c.course.lab.name} ${c.certNumber}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [certs, query]);

  if (certs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <FontAwesomeIcon icon={faCertificate} className="h-8 w-8 mb-3" />
          <p>Belum ada sertifikat. Lulus final exam untuk mendapatkannya.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari course, lab, atau nomor sertifikat..."
          containerClassName="w-full sm:w-64 md:w-80"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada sertifikat yang cocok dengan &quot;{query}&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FontAwesomeIcon icon={faCertificate} className="text-amber-500" />
                  {c.course.title}
                </CardTitle>
                <div className="text-[11px] text-muted-foreground">
                  {c.course.lab.name} · {formatDate(c.issuedAt)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">Nomor sertifikat</div>
                <code className="block font-mono text-sm font-bold border rounded-md bg-muted/30 px-3 py-2">
                  {c.certNumber}
                </code>
                <div className="flex gap-2 pt-1">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/certificates/${encodeURIComponent(c.certNumber)}`} target="_blank">
                      <FontAwesomeIcon icon={faPrint} /> Lihat & cetak
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/cert/${encodeURIComponent(c.certNumber)}`} target="_blank">
                      <FontAwesomeIcon icon={faExternalLink} /> Verifikasi publik
                    </Link>
                  </Button>
                </div>
                <Badge variant="success" className="text-[10px]">Berlaku</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
