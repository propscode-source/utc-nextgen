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

function autoCode(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export function BadgeCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [iconClass, setIconClass] = useState("fa-solid fa-medal");
  const [touchedCode, setTouchedCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(v: string) {
    setName(v);
    if (!touchedCode) setCode(autoCode(v));
  }

  async function create() {
    if (name.trim().length < 2 || description.trim().length < 2) {
      toast.error("Nama dan deskripsi wajib.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/badges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        code: code.trim(),
        description: description.trim(),
        iconClass: iconClass.trim() || "fa-solid fa-medal",
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal membuat.");
      return;
    }
    toast.success("Badge dibuat.");
    setName("");
    setCode("");
    setDescription("");
    setIconClass("fa-solid fa-medal");
    setTouchedCode(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlus} /> Badge baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah badge custom</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="b-name">Nama</Label>
            <Input id="b-name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Early Bird" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-code">Code unik</Label>
            <Input
              id="b-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toLowerCase());
                setTouchedCode(true);
              }}
              placeholder="early_bird"
            />
            <p className="text-[10px] text-muted-foreground">
              Untuk reference internal. Hanya huruf kecil, angka, dan underscore.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-desc">Deskripsi</Label>
            <Textarea id="b-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Daftar di minggu pertama peluncuran." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-icon">Icon Font Awesome class</Label>
            <Input id="b-icon" value={iconClass} onChange={(e) => setIconClass(e.target.value)} placeholder="fa-solid fa-medal" />
            <p className="text-[10px] text-muted-foreground">
              Misal: <code>fa-solid fa-trophy</code>, <code>fa-solid fa-fire</code>, dll.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={create} disabled={submitting}>
            <FontAwesomeIcon icon={submitting ? faSpinner : faPlus} className={submitting ? "animate-spin" : ""} />
            {submitting ? "Membuat…" : "Buat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
