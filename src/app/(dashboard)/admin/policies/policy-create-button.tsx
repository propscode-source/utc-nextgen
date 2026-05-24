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

function slugifyKey(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
  return base ? `policy.${base}` : "";
}

export function PolicyCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [touched, setTouched] = useState(false);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(): Promise<void> {
    if (name.trim().length < 2) { toast.error("Nama wajib."); return; }
    if (key.trim().length < 3) { toast.error("Key wajib (min. 3 karakter)."); return; }
    setBusy(true);
    const res = await fetch("/api/admin/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: key.trim(),
        name: name.trim(),
        description: desc.trim(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal membuat.");
      return;
    }
    const data = (await res.json()) as { id: string };
    toast.success("Policy dibuat. Lanjut atur permission-nya.");
    setOpen(false);
    router.push(`/admin/policies/${data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlus} /> Policy baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat policy</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Nama policy</Label>
            <Input
              id="p-name"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!touched) setKey(slugifyKey(e.target.value));
              }}
              placeholder="Mis. Approver TOR"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-key">Key unik</Label>
            <Input
              id="p-key"
              value={key}
              onChange={(e) => {
                setKey(e.target.value.toLowerCase());
                setTouched(true);
              }}
              placeholder="policy.approver_tor"
            />
            <p className="text-[10px] text-muted-foreground">
              Konvensi: prefix <code>policy.</code> + nama snake_case.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Deskripsi</Label>
            <Textarea id="p-desc" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
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
