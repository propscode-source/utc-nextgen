"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faGraduationCap, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

export type LabCourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isLocked: boolean;
  pointPrice: number;
  sectionCount: number;
  enrollmentCount: number;
};

export function LabCoursesTable({
  courses,
  labSlug,
  canManage,
}: {
  courses: LabCourseRow[];
  labSlug: string;
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => `${c.title} ${c.description ?? ""}`.toLowerCase().includes(q));
  }, [courses, query]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari course..."
            containerClassName="w-full sm:w-64 md:w-80"
          />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Section</TableHead>
                <TableHead className="text-right">Peserta</TableHead>
                <TableHead>Akses</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    {query
                      ? `Tidak ada course yang cocok dengan "${query}".`
                      : "Belum ada course."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3 text-muted-foreground mr-1" />
                      {c.sectionCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <FontAwesomeIcon icon={faGraduationCap} className="h-3 w-3 text-muted-foreground mr-1" />
                      {c.enrollmentCount}
                    </TableCell>
                    <TableCell>
                      {c.isLocked ? (
                        <Badge variant="warning">Bayar {c.pointPrice} poin</Badge>
                      ) : (
                        <Badge variant="success">Gratis</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/labs/${labSlug}/courses/${c.id}/edit`}>
                            <FontAwesomeIcon icon={faPenToSquare} /> Editor
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/courses/${c.slug}`}>Buka</Link>
                        </Button>
                      )}
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
