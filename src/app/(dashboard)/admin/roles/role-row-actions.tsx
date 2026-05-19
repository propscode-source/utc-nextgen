"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "@fortawesome/free-solid-svg-icons";

type Role = {
  id: string;
  name: string;
  key: string;
  isSystem: boolean;
  baseRole: "SUPERADMIN" | "LAB_ADMIN" | "PROCTOR" | "MAHASISWA";
  description: string | null;
};

export function RoleRowActions({ role }: { role: Role }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(role.name);
  const [desc, setDesc] = useState(role.description ?? "");
  const [baseRole, setBaseRole] = useState(role.baseRole);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/admin/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: desc.trim() || null,
        ...(role.isSystem ? {} : { baseRole }),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menyimpan.");
      return;
    }
    toast.success("Tersimpan.");
    setEditOpen(false);
    router.refresh();
  }

  async function destroy() {
    if (!confirm(`Hapus role "${role.name}"? Pengguna yang ter-assign akan kehilangan permission dari role ini.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menghapus.");
      return;
    }
    toast.success("Role dihapus.");
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
            <FontAwesomeIcon icon={faPenToSquare} /> Edit metadata
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={destroy} disabled={role.isSystem}>
            <FontAwesomeIcon icon={faTrash} />
            {role.isSystem ? "Hapus (terkunci, bawaan)" : "Hapus role"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role: {role.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rn">Nama</Label>
              <Input id="rn" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rd">Deskripsi</Label>
              <Textarea id="rd" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            {!role.isSystem && (
              <div className="space-y-1.5">
                <Label>Base role</Label>
                <Select value={baseRole} onValueChange={(v) => setBaseRole(v as typeof baseRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
                    <SelectItem value="LAB_ADMIN">Lab Admin</SelectItem>
                    <SelectItem value="PROCTOR">Proctor</SelectItem>
                    <SelectItem value="MAHASISWA">Mahasiswa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <p className="text-[10px] font-mono text-muted-foreground">Key: {role.key}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={save} disabled={busy}>
              <FontAwesomeIcon icon={busy ? faSpinner : faPenToSquare} className={busy ? "animate-spin" : ""} />
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
