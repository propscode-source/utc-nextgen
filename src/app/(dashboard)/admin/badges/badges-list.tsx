"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { BadgeRowActions } from "./badge-row-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMedal } from "@fortawesome/free-solid-svg-icons";

export type BadgeAwardPreview = {
  id: string;
  user: { id: string; name: string; nim: string | null };
};

export type BadgeListItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  iconClass: string;
  isSystem: boolean;
  awardCount: number;
  awards: BadgeAwardPreview[];
};

export function BadgesList({ badges }: { badges: BadgeListItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return badges;
    return badges.filter((b) =>
      `${b.name} ${b.code} ${b.description}`.toLowerCase().includes(q)
    );
  }, [badges, query]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari badge, kode, atau deskripsi..."
          containerClassName="w-full sm:w-64 md:w-80"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {query
                ? `Tidak ada badge yang cocok dengan "${query}".`
                : "Belum ada badge."}
            </CardContent>
          </Card>
        ) : (
          filtered.map((b) => (
            <Card key={b.id}>
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <FontAwesomeIcon icon={faMedal} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {b.name}
                    {b.isSystem && (
                      <UiBadge variant="info" className="text-[10px]">Sistem (auto-award)</UiBadge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    {b.code} · {b.iconClass}
                  </div>
                </div>
                <BadgeRowActions
                  badge={{
                    id: b.id,
                    code: b.code,
                    name: b.name,
                    description: b.description,
                    iconClass: b.iconClass,
                    isSystem: b.isSystem,
                  }}
                />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Diraih oleh <strong>{b.awardCount}</strong> mahasiswa
                </div>
                {b.awards.length > 0 && (
                  <ul className="text-xs space-y-1">
                    {b.awards.map((a) => (
                      <li key={a.id} className="text-muted-foreground">
                        • {a.user.name} {a.user.nim ? `(${a.user.nim})` : ""}
                      </li>
                    ))}
                    {b.awardCount > 5 && (
                      <li className="text-[11px] text-muted-foreground italic">
                        … dan {b.awardCount - 5} lainnya
                      </li>
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
