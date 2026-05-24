"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faSpinner } from "@fortawesome/free-solid-svg-icons";
import type { EventStatus } from "@prisma/client";
import { EVENT_STATUS_LABEL } from "@/lib/events";

export type EventFormValues = {
  title: string;
  slug?: string;
  description: string;
  posterUrl: string;
  location: string;
  startsAt: string;        // datetime-local format
  endsAt: string;
  attendanceOpensAt: string;
  attendanceClosesAt: string;
  attendanceCode: string;
  pointReward: number;
  status: EventStatus;
  isPublic: boolean;
  labId: string;           // "" = no lab
};

const STATUS_OPTIONS: EventStatus[] = ["DRAFT", "PUBLISHED", "ONGOING", "COMPLETED", "CANCELLED"];

export function EventForm({
  initial,
  labs,
  onSubmit,
  showSlug = false,
  submitLabel = "Simpan",
  submittingLabel = "Menyimpan…",
}: {
  initial: EventFormValues;
  labs: { id: string; name: string }[];
  onSubmit: (v: EventFormValues) => Promise<void>;
  showSlug?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof EventFormValues>(k: K, val: EventFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  async function handle() {
    setBusy(true);
    try {
      await onSubmit(v);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label htmlFor="ev-title">Judul event</Label>
        <Input id="ev-title" value={v.title} onChange={(e) => set("title", e.target.value)} />
      </div>

      {showSlug && (
        <div className="space-y-1.5">
          <Label htmlFor="ev-slug">Slug (opsional)</Label>
          <Input
            id="ev-slug"
            value={v.slug ?? ""}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="auto-dari-judul"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="ev-desc">Deskripsi</Label>
        <Textarea id="ev-desc" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ev-loc">Lokasi</Label>
          <Input id="ev-loc" value={v.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-poster">URL poster (opsional)</Label>
          <Input
            id="ev-poster"
            placeholder="https://…"
            value={v.posterUrl}
            onChange={(e) => set("posterUrl", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ev-start">Mulai</Label>
          <Input
            id="ev-start"
            type="datetime-local"
            value={v.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-end">Selesai</Label>
          <Input
            id="ev-end"
            type="datetime-local"
            value={v.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ev-att-open">Presensi buka (opsional)</Label>
          <Input
            id="ev-att-open"
            type="datetime-local"
            value={v.attendanceOpensAt}
            onChange={(e) => set("attendanceOpensAt", e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">Default: sama dengan waktu mulai event.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-att-close">Presensi tutup (opsional)</Label>
          <Input
            id="ev-att-close"
            type="datetime-local"
            value={v.attendanceClosesAt}
            onChange={(e) => set("attendanceClosesAt", e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">Default: 1 jam setelah event selesai.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ev-code">Kode presensi (opsional)</Label>
          <Input
            id="ev-code"
            value={v.attendanceCode}
            onChange={(e) => set("attendanceCode", e.target.value)}
            placeholder="UTC2026"
          />
          <p className="text-[10px] text-muted-foreground">Dibagikan saat event. Kosong = check-in tanpa kode.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ev-points">Poin reward</Label>
          <Input
            id="ev-points"
            type="number"
            min={0}
            value={v.pointReward}
            onChange={(e) => set("pointReward", Number(e.target.value) || 0)}
          />
          <p className="text-[10px] text-muted-foreground">Diberikan ke setiap presensi saat event difinalisasi.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={v.status} onValueChange={(val) => set("status", val as EventStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {EVENT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Lab penyelenggara</Label>
          <Select value={v.labId || "__none__"} onValueChange={(val) => set("labId", val === "__none__" ? "" : val)}>
            <SelectTrigger>
              <SelectValue placeholder="UTC Pusat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">UTC Pusat (tanpa lab)</SelectItem>
              {labs.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.isPublic}
          onChange={(e) => set("isPublic", e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Tampilkan di landing page publik
      </label>

      <div className="flex justify-end pt-2">
        <Button onClick={handle} disabled={busy}>
          <FontAwesomeIcon icon={busy ? faSpinner : faFloppyDisk} className={busy ? "animate-spin" : ""} />
          {busy ? submittingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** Convert ISO/Date → string compatible with <input type="datetime-local"> (local time). */
export function toLocalInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const off = date.getTimezoneOffset();
  const local = new Date(date.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}
