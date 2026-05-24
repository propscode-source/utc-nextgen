"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlask, faUsers, faClipboardList, faBoxesStacked } from "@fortawesome/free-solid-svg-icons";
import { LabRowActions } from "./lab-row-actions";

export type LabListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  admin: { name: string; email: string } | null;
  _count: { members: number; courses: number; projects: number; assets: number };
};

type Props = {
  labs: LabListItem[];
  isSuper: boolean;
};

export function LabsList({ labs, isSuper }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return labs;
    return labs.filter((l) => {
      const haystack = `${l.name} ${l.description ?? ""} ${l.admin?.name ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [labs, query]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari lab, deskripsi, atau admin..."
          containerClassName="w-full sm:w-64 md:w-80"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            {query
              ? `Tidak ada lab yang cocok dengan "${query}".`
              : "Belum ada lab yang bisa ditampilkan."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lab) => (
            <Card key={lab.id} className="hover:shadow-md transition">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <FontAwesomeIcon icon={faFlask} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">
                    <Link href={`/labs/${lab.slug}`} className="hover:underline">
                      {lab.name}
                    </Link>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {lab.description || "Tidak ada deskripsi."}
                  </p>
                </div>
                {isSuper && (
                  <LabRowActions
                    lab={{
                      id: lab.id,
                      name: lab.name,
                      description: lab.description ?? "",
                    }}
                  />
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Admin:{" "}
                  {lab.admin ? (
                    <Badge variant="secondary">{lab.admin.name}</Badge>
                  ) : (
                    <Badge variant="outline">Belum di-assign</Badge>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <Stat icon={faUsers} value={lab._count.members} label="Anggota" />
                  <Stat icon={faClipboardList} value={lab._count.courses} label="Course" />
                  <Stat icon={faClipboardList} value={lab._count.projects} label="Proker" />
                  <Stat icon={faBoxesStacked} value={lab._count.assets} label="Aset" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: typeof faUsers; value: number; label: string }) {
  return (
    <div className="rounded-md border p-2">
      <FontAwesomeIcon icon={icon} className="h-3 w-3 text-muted-foreground" />
      <div className="text-sm font-bold mt-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
