"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { formatPoints } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins } from "@fortawesome/free-solid-svg-icons";

export type LeaderRow = {
  userId: string;
  name: string;
  image: string | null;
  prodi: string | null;
  points: number;
};

export function LeaderboardList({ rows, currentUserId }: { rows: LeaderRow[]; currentUserId: string }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows.map((r, idx) => ({ row: r, idx }));
    return rows
      .map((r, idx) => ({ row: r, idx }))
      .filter(({ row }) => `${row.name} ${row.prodi ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari nama atau prodi..."
          containerClassName="w-full sm:w-64 md:w-80"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {query
                ? `Tidak ada hasil untuk "${query}".`
                : "Belum ada aktivitas pada periode ini."}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(({ row: r, idx }) => {
                const me = r.userId === currentUserId;
                const initials = r.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <li
                    key={r.userId}
                    className={`flex items-center gap-3 px-5 py-3 ${me ? "bg-primary/5" : ""}`}
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold tabular-nums ${
                        idx === 0
                          ? "bg-amber-500 text-white"
                          : idx === 1
                            ? "bg-zinc-400 text-white"
                            : idx === 2
                              ? "bg-orange-500 text-white"
                              : "bg-muted"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <Avatar className="h-9 w-9">
                      {r.image && <AvatarImage src={r.image} alt={r.name} />}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {r.name}
                        {me && <Badge variant="info" className="text-[10px]">Kamu</Badge>}
                      </div>
                      {r.prodi && <div className="text-xs text-muted-foreground truncate">{r.prodi}</div>}
                    </div>
                    <div className="font-bold tabular-nums inline-flex items-center gap-1 text-amber-500">
                      <FontAwesomeIcon icon={faCoins} className="h-3 w-3" />
                      {formatPoints(r.points)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
