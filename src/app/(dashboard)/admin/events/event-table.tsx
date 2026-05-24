"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { EventRowActions } from "./event-row-actions";
import { formatDate, formatPoints } from "@/lib/utils";
import { EVENT_STATUS_LABEL, EVENT_STATUS_VARIANT } from "@/lib/events";
import type { EventStatus } from "@prisma/client";

export type EventTableItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  posterUrl: string | null;
  location: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  attendanceOpensAt: Date | string | null;
  attendanceClosesAt: Date | string | null;
  attendanceCode: string | null;
  pointReward: number;
  status: EventStatus;
  isPublic: boolean;
  labId: string | null;
  labName: string | null;
  finalizedAt: Date | string | null;
  attendanceCount: number;
};

export function EventTable({
  items,
  labs,
}: {
  items: EventTableItem[];
  labs: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== "ALL" && it.status !== statusFilter) return false;
      if (!q) return true;
      return `${it.title} ${it.slug} ${it.description ?? ""} ${it.location ?? ""} ${it.labName ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, statusFilter]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["ALL", "DRAFT", "PUBLISHED", "ONGOING", "COMPLETED", "CANCELLED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent"
                }`}
              >
                {s === "ALL" ? "Semua" : EVENT_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Cari judul, lokasi, lab…"
            containerClassName="w-full sm:w-64 md:w-80"
          />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Jadwal</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead className="text-right">Poin</TableHead>
                <TableHead className="text-right">Presensi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    {query || statusFilter !== "ALL" ? "Tidak ada event yang cocok." : "Belum ada event."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <Link href={`/admin/events/${it.id}`} className="font-medium hover:underline">
                        {it.title}
                      </Link>
                      {it.location && (
                        <div className="text-xs text-muted-foreground">📍 {it.location}</div>
                      )}
                      <div className="text-[10px] font-mono text-muted-foreground mt-1">{it.slug}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{formatDate(it.startsAt)}</div>
                      <div className="text-muted-foreground">→ {formatDate(it.endsAt)}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {it.labName ?? <span className="text-muted-foreground italic">UTC pusat</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="text-amber-500 font-semibold">+{formatPoints(it.pointReward)}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{it.attendanceCount}</TableCell>
                    <TableCell>
                      <Badge variant={EVENT_STATUS_VARIANT[it.status]}>{EVENT_STATUS_LABEL[it.status]}</Badge>
                      {it.finalizedAt && (
                        <div className="text-[10px] text-muted-foreground mt-1">Finalisasi ✓</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <EventRowActions item={it} labs={labs} />
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
