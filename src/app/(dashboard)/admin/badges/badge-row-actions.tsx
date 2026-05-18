"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisVertical,
  faPenToSquare,
  faTrash,
  faUserPlus,
  faSpinner,
  faFloppyDisk,
} from "@fortawesome/free-solid-svg-icons";

type Badge = {
  id: string;
  code: string;
  name: string;
  description: string;
  iconClass: string;
  isSystem: boolean;
};

export function BadgeRowActions({ badge }: { badge: Badge }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState(false);
  const [name, setName] = useState(badge.name);
  const [description, setDescription] = useState(badge.description);
  const [iconClass, setIconClass] = useState(badge.iconClass);
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/badges/${badge.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, iconClass }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Gagal menyimpan.");
      return;
    }
    toast.success("Badge diperbarui.");
    setEditOpen(false);
    router.refresh();
  }

  async function awardManual() {
    if (!identifier.trim()) {
      toast.error("Email atau NIM wajib.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/badges/${badge.id}/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal award.");
      return;
    }
    const body = (await res.json()) as { name: string };
    toast.success(`Badge diberikan ke ${body.name}.`);
    setIdentifier("");
    setAwardOpen(false);
    router.refresh();
  }

  async function destroy() {
    if (
      !confirm(
        `Hapus badge "${badge.name}"? Semua user yang sudah dapat badge ini akan kehilangan badge-nya.${
          badge.isSystem ? "\n\nPERINGATAN: Ini badge sistem. Aturan auto-award akan tetap aktif tapi tidak bisa memberikan badge ini lagi sampai badge dengan code yang sama dibuat ulang." : ""
        }`
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/badges/${badge.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Gagal menghapus.");
      return;
    }
    toast.success("Badge dihapus.");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={busy} aria-label="Aksi">
            <FontAwesomeIcon icon={faEllipsisVertical} className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setAwardOpen(true)}>
            <FontAwesomeIcon icon={faUserPlus} /> Award manual
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <FontAwesomeIcon icon={faPenToSquare} /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={destroy}>
            <FontAwesomeIcon icon={faTrash} /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit badge</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Code (read-only)</Label>
              <Input value={badge.code} disabled readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-name">Nama</Label>
              <Input id="eb-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-desc">Deskripsi</Label>
              <Textarea id="eb-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-icon">Icon class</Label>
              <Input id="eb-icon" value={iconClass} onChange={(e) => setIconClass(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={save} disabled={busy}>
              <FontAwesomeIcon icon={busy ? faSpinner : faFloppyDisk} className={busy ? "animate-spin" : ""} />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={awardOpen} onOpenChange={setAwardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award badge ke mahasiswa</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="aw-id">Email atau NIM</Label>
            <Input
              id="aw-id"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  awardManual();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwardOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={awardManual} disabled={busy}>
              <FontAwesomeIcon icon={busy ? faSpinner : faUserPlus} className={busy ? "animate-spin" : ""} />
              Award
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
