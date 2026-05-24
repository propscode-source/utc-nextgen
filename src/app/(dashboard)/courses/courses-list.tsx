"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGraduationCap,
  faLayerGroup,
  faCoins,
  faLock,
  faMagnifyingGlass,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { formatPoints } from "@/lib/utils";

export type CourseListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isLocked: boolean;
  pointPrice: number;
  lab: { name: string; slug: string };
  _count: { sections: number; enrollments: number };
};

type LabOption = { slug: string; name: string };

type Props = {
  labs: LabOption[];
  labFilter?: string;
  courses: CourseListItem[];
  enrolledIds: string[];
};

export function CoursesList({ labs, labFilter, courses, enrolledIds }: Props) {
  const [query, setQuery] = useState("");
  const enrolledSet = useMemo(() => new Set(enrolledIds), [enrolledIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const haystack = `${c.title} ${c.lab.name} ${c.description ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [courses, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/courses"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${!labFilter ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
          >
            Semua lab
          </Link>
          {labs.map((l) => (
            <Link
              key={l.slug}
              href={`/courses?lab=${l.slug}`}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${labFilter === l.slug ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
            >
              {l.name}
            </Link>
          ))}
        </div>

        <div className="relative w-full sm:ml-auto sm:w-64 md:w-80">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari course, lab, atau deskripsi..."
            aria-label="Cari course"
            className="pl-9 pr-9 h-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Bersihkan pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {query
              ? `Tidak ada course yang cocok dengan "${query}".`
              : "Belum ada course di kategori ini."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const enrolled = enrolledSet.has(c.id);
            return (
              <Card key={c.id} className="hover:shadow-md transition flex flex-col">
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {c.lab.name}
                    </Badge>
                    {c.isLocked && (
                      <Badge variant="warning" className="text-[10px]">
                        <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5 mr-1" />
                        {formatPoints(c.pointPrice)} poin
                      </Badge>
                    )}
                    {enrolled && (
                      <Badge variant="success" className="text-[10px]">
                        Terdaftar
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base">
                    <Link href={`/courses/${c.slug}`} className="hover:underline">
                      {c.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
                    {c.description || "Tidak ada deskripsi."}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3" />
                      {c._count.sections} section
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FontAwesomeIcon icon={faGraduationCap} className="h-3 w-3" />
                      {c._count.enrollments} peserta
                    </span>
                    {c.pointPrice > 0 && !c.isLocked && (
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <FontAwesomeIcon icon={faCoins} className="h-3 w-3" />
                        {formatPoints(c.pointPrice)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
