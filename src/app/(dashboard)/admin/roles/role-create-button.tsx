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
  DialogTrigger,
} from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSpinner } from "@fortawesome/free-solid-svg-icons";

function slugifyKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export function RoleCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [touchedKey, setTouchedKey] = useState(false);
  const [desc, setDesc] = useState("");
  const [baseRole, setBaseRole] = useState<"SUPERADMIN" | "LAB_ADMIN" | "PROCTOR" | "MAHASISWA">("LAB_ADMIN");
  const [busy, setBusy] = useState(false);

  async function create(): Promise<void> {
    if (name.trim().length < 2) { toast.error("Nama wajib (min. 2 karakter.)"); return; }
    if (key.trim().length < 3) { toast.error("Key wajib (min. 3 karakter)."); return; }
    if (key.startsWith("system.")) { toast.error("Prefix 'system.' direservasi."); return; }
    setBusy(true);
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: key.trim(),
        name: name.trim(),
        description: desc.trim(),
        baseRole,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal membuat.");
      return;
    }
    const data = (await res.json()) as { id: string };
    toast.success("Role dibuat. Lanjut atur rule & policy.");
    setOpen(false);
    router.push(`/admin/roles/${data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlus} /> Role baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat role custom</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">Nama role</Label>
            <Input
              id="r-name"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!touchedKey) setKey(slugifyKey(e.target.value));
              }}
              placeholder="Mis. Head Proctor"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-key">Key unik</Label>
            <Input
              id="r-key"
              value={key}
              onChange={(e) => {
                setKey(e.target.value.toLowerCase());
                setTouchedKey(true);
              }}
              placeholder="head_proctor"
            />
            <p className="text-[10px] text-muted-foreground">
              Huruf kecil, angka, dot, underscore. Tidak boleh berawalan <code>system.</code>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-desc">Deskripsi</Label>
            <Textarea id="r-desc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
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
            <p className="text-[10px] text-muted-foreground">
              Menentukan navigasi default dan system role yang otomatis aktif. Bisa diubah belakangan.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Batal
          </Button>
          <Button onClick={create} disabled={busy}>
            <FontAwesomeIcon icon={busy ? faSpinner : faPlus} className={busy ? "animate-spin" : ""} />
            {busy ? "Membuat…" : "Buat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
