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

function autoSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function LabCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touchedSlug, setTouchedSlug] = useState(false);

  function handleNameChange(v: string) {
    setName(v);
    if (!touchedSlug) setSlug(autoSlug(v));
  }

  async function create() {
    if (name.trim().length < 3) {
      toast.error("Nama minimal 3 karakter.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/labs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal membuat lab.");
      return;
    }
    const body = (await res.json()) as { slug: string };
    toast.success("Lab dibuat.");
    setName("");
    setSlug("");
    setDescription("");
    setTouchedSlug(false);
    setOpen(false);
    router.push(`/labs/${body.slug}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlus} /> Lab baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat lab baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="l-name">Nama lab</Label>
            <Input
              id="l-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Lab Kecerdasan Buatan"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-slug">Slug URL</Label>
            <Input
              id="l-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase());
                setTouchedSlug(true);
              }}
              placeholder="lab-kecerdasan-buatan"
            />
            <p className="text-[10px] text-muted-foreground">
              Akan diakses di /labs/{slug || "<slug>"}. Auto-generate dari nama.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="l-desc">Deskripsi</Label>
            <Textarea id="l-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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
