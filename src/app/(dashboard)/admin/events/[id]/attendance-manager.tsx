"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserPlus,
  faTrash,
  faTrophy,
  faSpinner,
  faSearch,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { formatDate, formatPoints } from "@/lib/utils";
import type { EventStatus } from "@prisma/client";

export type AttendanceRow = {
  id: string;
  userId: string;
  checkedInAt: Date | string;
  note: string | null;
  pointsAwarded: number;
  awardedAt: Date | string | null;
  user: { id: string; name: string; email: string; nim: string | null; prodi: string | null };
};

type UserSearchResult = { id: string; name: string; email: string; nim: string | null };

export function AttendanceManager({
  eventId,
  rows,
  pointReward,
  isFinalized,
  status,
}: {
  eventId: string;
  rows: AttendanceRow[];
  pointReward: number;
  isFinalized: boolean;
  status: EventStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = rows.filter((r) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return `${r.user.name} ${r.user.email} ${r.user.nim ?? ""} ${r.user.prodi ?? ""}`
      .toLowerCase()
      .includes(q);
  });

  async function removeRow(userId: string, name: string) {
    if (!confirm(`Hapus presensi "${name}"?`)) return;
    setBusy(true);
    const res = await fetch(`/api/events/${eventId}/attendance`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menghapus.");
      return;
    }
    toast.success("Presensi dihapus.");
    router.refresh();
  }

  async function finalize() {
    if (
      !confirm(
        `Bagikan ${pointReward} poin ke ${rows.filter((r) => !r.awardedAt).length} peserta yang belum diberi poin? Status event akan jadi COMPLETED.`
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/events/${eventId}/finalize`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal finalisasi.");
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { awarded?: number };
    toast.success(`Finalisasi sukses. ${data.awarded ?? 0} peserta dapat poin.`);
    router.refresh();
  }

  function exportCsv() {
    const header = ["No", "Nama", "NIM", "Email", "Prodi", "Waktu Presensi", "Poin", "Catatan"];
    const lines = [header.join(",")];
    rows.forEach((r, i) => {
      const cells = [
        String(i + 1),
        r.user.name,
        r.user.nim ?? "",
        r.user.email,
        r.user.prodi ?? "",
        new Date(r.checkedInAt).toISOString(),
        String(r.pointsAwarded),
        (r.note ?? "").replace(/[\r\n,]+/g, " "),
      ].map((c) => `"${c.replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presensi-event-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Rekap Presensi ({rows.length})</h2>
            <p className="text-xs text-muted-foreground">
              {isFinalized
                ? "Event sudah difinalisasi. Daftar bersifat read-only."
                : "Tambah peserta manual atau biarkan mahasiswa check-in sendiri lewat halaman event."}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <FontAwesomeIcon icon={faDownload} /> Export CSV
            </Button>
            {!isFinalized && (
              <Button
                onClick={finalize}
                disabled={busy || rows.length === 0 || status === "CANCELLED"}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <FontAwesomeIcon icon={busy ? faSpinner : faTrophy} className={busy ? "animate-spin" : ""} />
                Finalisasi & Bagikan Poin
              </Button>
            )}
          </div>
        </div>

        {!isFinalized && <ManualAddRow eventId={eventId} onAdded={() => router.refresh()} />}

        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faSearch} className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Cari nama, NIM, email…"
            className="h-9 max-w-sm"
          />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Peserta</TableHead>
                <TableHead>NIM / Prodi</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Poin</TableHead>
                {!isFinalized && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isFinalized ? 6 : 7}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    {rows.length === 0 ? "Belum ada presensi." : "Tidak ada yang cocok."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.user.name}</div>
                      <div className="text-xs text-muted-foreground">{r.user.email}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-mono">{r.user.nim ?? "—"}</div>
                      <div className="text-muted-foreground">{r.user.prodi ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(r.checkedInAt)}</TableCell>
                    <TableCell className="text-xs max-w-[18ch] truncate" title={r.note ?? ""}>
                      {r.note ?? <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.awardedAt ? (
                        <Badge variant="success">+{formatPoints(r.pointsAwarded)}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Pending</Badge>
                      )}
                    </TableCell>
                    {!isFinalized && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          onClick={() => removeRow(r.userId, r.user.name)}
                          aria-label="Hapus"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
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

function ManualAddRow({ eventId, onAdded }: { eventId: string; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function search(value: string) {
    setQ(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(value)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { users?: UserSearchResult[] };
    setResults(data.users ?? []);
    setOpen(true);
  }

  async function add(userId: string, name: string) {
    setBusy(true);
    const res = await fetch(`/api/events/${eventId}/attendance?mode=admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menambah.");
      return;
    }
    toast.success(`${name} ditandai hadir.`);
    setQ("");
    setResults([]);
    setOpen(false);
    onAdded();
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
        <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => search(e.target.value)}
          placeholder="Tambah peserta manual — ketik nama, NIM, atau email…"
          className="h-8 border-0 bg-transparent focus-visible:ring-0"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {busy && <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => add(u.id, u.name)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-0"
            >
              <div className="font-medium">{u.name}</div>
              <div className="text-xs text-muted-foreground">
                {u.nim ? `${u.nim} · ` : ""}{u.email}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
