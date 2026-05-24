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
  DialogTrigger,
} from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSpinner } from "@fortawesome/free-solid-svg-icons";

export function PermissionCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [category, setCategory] = useState("");
  const [label, setLabel] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(): Promise<void> {
    if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(key)) {
      toast.error("Format key: resource.action (huruf kecil, dot, underscore).");
      return;
    }
    if (label.trim().length < 2) { toast.error("Label wajib."); return; }
    if (category.trim().length < 2) { toast.error("Kategori wajib."); return; }
    setBusy(true);
    const res = await fetch("/api/admin/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: key.trim(),
        category: category.trim(),
        label: label.trim(),
        description: desc.trim(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal membuat.");
      return;
    }
    toast.success("Permission dibuat.");
    setKey("");
    setCategory("");
    setLabel("");
    setDesc("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlus} /> Permission baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah permission custom</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pk">Key</Label>
            <Input
              id="pk"
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase())}
              placeholder="contoh: report.export_external"
            />
            <p className="text-[10px] text-muted-foreground">
              Format: <code>resource.action</code>. Tidak boleh diubah setelah dipakai oleh kode.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pc">Kategori</Label>
              <Input id="pc" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Mis. Laporan" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl">Label</Label>
              <Input id="pl" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Export laporan ke email" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd">Deskripsi</Label>
            <Textarea id="pd" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Batal</Button>
          <Button onClick={create} disabled={busy}>
            <FontAwesomeIcon icon={busy ? faSpinner : faPlus} className={busy ? "animate-spin" : ""} />
            {busy ? "Membuat…" : "Buat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
