"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCoins, faSpinner, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";
import { formatDate, formatPoints } from "@/lib/utils";
import type { EventStatus } from "@prisma/client";

export function CheckInPanel({
  eventId,
  eventTitle,
  open,
  needsCode,
  myAttendance,
  status,
  pointReward,
}: {
  eventId: string;
  eventTitle: string;
  open: boolean;
  needsCode: boolean;
  myAttendance: {
    checkedInAt: Date | string;
    pointsAwarded: number;
    awardedAt: Date | string | null;
    note: string | null;
  } | null;
  status: EventStatus;
  pointReward: number;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (needsCode && !code.trim()) {
      toast.error("Kode presensi wajib diisi.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/events/${eventId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), note: note.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal presensi.");
      return;
    }
    toast.success(`Presensi tercatat untuk ${eventTitle}.`);
    router.refresh();
  }

  // Already attended
  if (myAttendance) {
    const awarded = !!myAttendance.awardedAt;
    return (
      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
            <FontAwesomeIcon icon={faCheck} />
            Anda sudah presensi
          </div>
          <p className="text-xs text-muted-foreground">
            Tercatat hadir pada {formatDate(myAttendance.checkedInAt)}.
          </p>
          {awarded ? (
            <Badge variant="success" className="gap-1">
              <FontAwesomeIcon icon={faCoins} className="h-3 w-3" />
              +{formatPoints(myAttendance.pointsAwarded)} poin diterima
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[11px]">
              Menunggu finalisasi admin (+{formatPoints(pointReward)} poin)
            </Badge>
          )}
          {myAttendance.note && (
            <p className="text-xs italic text-muted-foreground border-l-2 border-emerald-500/30 pl-2 mt-2">
              {myAttendance.note}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (status === "COMPLETED" || status === "CANCELLED") {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground">
          {status === "CANCELLED"
            ? "Event dibatalkan — presensi tidak tersedia."
            : "Event sudah selesai. Anda tidak mengisi presensi tepat waktu."}
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Jendela presensi belum dibuka. Datanglah saat event berlangsung untuk mengisi kehadiran.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <FontAwesomeIcon icon={faClipboardCheck} className="text-primary" />
          Isi Presensi
        </div>
        <p className="text-xs text-muted-foreground">
          Isi formulir di akhir event untuk mendapatkan{" "}
          <strong className="text-amber-500">+{formatPoints(pointReward)} poin</strong> setelah admin
          memfinalisasi event.
        </p>
        {needsCode && (
          <div className="space-y-1.5">
            <Label htmlFor="att-code">Kode presensi</Label>
            <Input
              id="att-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Tanyakan ke panitia"
              autoComplete="off"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="att-note">Catatan / feedback (opsional)</Label>
          <Textarea
            id="att-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ceritakan pengalamanmu di event ini…"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={busy}>
            <FontAwesomeIcon icon={busy ? faSpinner : faCheck} className={busy ? "animate-spin" : ""} />
            {busy ? "Mengirim…" : "Kirim Presensi"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
