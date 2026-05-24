"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SearchInput } from "@/components/ui/search-input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faGraduationCap } from "@fortawesome/free-solid-svg-icons";

export type MyCourseItem = {
  id: string;
  course: { slug: string; title: string; lab: { name: string } };
  progress: { progressPct: number; fullyDone: boolean };
};

export function MyCoursesList({ items }: { items: MyCourseItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) => {
      const haystack = `${e.course.title} ${e.course.lab.name}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FontAwesomeIcon icon={faGraduationCap} className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada course terdaftar.</p>
          <Button asChild className="mt-4">
            <Link href="/courses">Telusuri katalog</Link>
          </Button>
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
          placeholder="Cari course atau lab..."
          containerClassName="w-full sm:w-64 md:w-80"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada course yang cocok dengan &quot;{query}&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Card key={e.id} className="flex flex-col">
              <CardHeader className="space-y-1.5">
                <Badge variant="secondary" className="self-start text-[10px]">
                  {e.course.lab.name}
                </Badge>
                <CardTitle className="text-base">{e.course.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <Progress value={e.progress.progressPct} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{e.progress.progressPct}% selesai</span>
                  {e.progress.fullyDone && <Badge variant="success">Selesai</Badge>}
                </div>
                <Button asChild className="mt-auto" variant={e.progress.fullyDone ? "outline" : "default"}>
                  <Link href={`/courses/${e.course.slug}/learn`}>
                    <FontAwesomeIcon icon={faPlay} />
                    {e.progress.fullyDone ? "Tinjau ulang" : "Lanjut belajar"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
