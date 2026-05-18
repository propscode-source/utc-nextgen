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
  faSpinner,
  faFloppyDisk,
} from "@fortawesome/free-solid-svg-icons";

type Lab = { id: string; name: string; description: string };

export function LabRowActions({ lab }: { lab: Lab }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(lab.name);
  const [description, setDescription] = useState(lab.description);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (name.trim().length < 3) {
      toast.error("Nama minimal 3 karakter.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/labs/${lab.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Gagal menyimpan.");
      return;
    }
    toast.success("Lab diperbarui.");
    setEditOpen(false);
    router.refresh();
  }

  async function destroy() {
    if (
      !window.confirm(
        `Hapus lab "${lab.name}"? SEMUA course, anggota, TOR, proker, dan aset di dalamnya akan ikut terhapus.`
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/labs/${lab.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menghapus.");
      return;
    }
    toast.success("Lab dihapus.");
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
            <DialogTitle>Edit lab</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="el-name">Nama</Label>
              <Input id="el-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="el-desc">Deskripsi</Label>
              <Textarea id="el-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Slug URL tidak bisa diubah agar link lama tidak rusak.
            </p>
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
    </>
  );
}
