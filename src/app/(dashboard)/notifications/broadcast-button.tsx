"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullhorn, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NotificationType, Role } from "@prisma/client";

const TYPES: { value: NotificationType; label: string }[] = [
  { value: "INFO", label: "Info" },
  { value: "COURSE", label: "Course" },
  { value: "EXAM", label: "Ujian" },
  { value: "BADGE", label: "Badge" },
  { value: "SYSTEM", label: "Sistem" },
];

const ROLES: { value: Role; label: string }[] = [
  { value: "MAHASISWA", label: "Mahasiswa" },
  { value: "LAB_ADMIN", label: "Lab Admin" },
  { value: "PROCTOR", label: "Proctor" },
  { value: "SUPERADMIN", label: "Superadmin" },
];

export function BroadcastButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotificationType>("INFO");
  const [link, setLink] = useState("");
  const [roles, setRoles] = useState<Role[]>(["MAHASISWA"]);
  const [submitting, setSubmitting] = useState(false);

  function toggleRole(r: Role) {
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }

  function reset() {
    setTitle("");
    setBody("");
    setType("INFO");
    setLink("");
    setRoles(["MAHASISWA"]);
  }

  async function submit() {
    if (title.trim().length < 2 || body.trim().length < 2) {
      toast.error("Judul dan isi wajib diisi.");
      return;
    }
    if (roles.length === 0) {
      toast.error("Pilih minimal satu role tujuan.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        type,
        link: link.trim() || null,
        roles,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal mengirim.");
      return;
    }
    const data = (await res.json()) as { count: number };
    toast.success(`Notifikasi terkirim ke ${data.count} user.`);
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faBullhorn} /> Broadcast
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kirim notifikasi broadcast</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="n-title">Judul</Label>
            <Input
              id="n-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pengumuman maintenance"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-body">Isi pesan</Label>
            <Textarea
              id="n-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Sistem akan maintenance pada hari Minggu pukul 02.00 WIB selama 1 jam…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="n-type">Tipe</Label>
              <Select value={type} onValueChange={(v) => setType(v as NotificationType)}>
                <SelectTrigger id="n-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-link">Link (opsional)</Label>
              <Input
                id="n-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/courses/abc"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Kirim ke role</Label>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r) => {
                const active = roles.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => toggleRole(r.value)}
                    className={
                      "h-7 rounded-full border px-3 text-xs font-medium transition-colors " +
                      (active
                        ? "border-primary bg-primary text-white"
                        : "border-primary/15 bg-card text-muted-foreground hover:bg-primary/10 hover:text-foreground")
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <FontAwesomeIcon
              icon={submitting ? faSpinner : faBullhorn}
              className={submitting ? "animate-spin" : ""}
            />
            {submitting ? "Mengirim…" : "Kirim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
