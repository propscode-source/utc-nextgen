"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function TorCreateButton({ labId, slug }: { labId: string; slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function create() {
    if (title.trim().length < 3) {
      toast.error("Judul minimal 3 karakter.");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/labs/${labId}/tor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal membuat TOR.");
      return;
    }
    const body = (await res.json()) as { id: string };
    toast.success("TOR draft dibuat.");
    setTitle("");
    setOpen(false);
    router.push(`/labs/${slug}/tor/${body.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlus} /> TOR baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat TOR baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="title">Judul TOR</Label>
          <Input
            id="title"
            placeholder="TOR Pelatihan Database 2025"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={create} disabled={submitting}>
            <FontAwesomeIcon icon={submitting ? faSpinner : faPlus} className={submitting ? "animate-spin" : ""} />
            {submitting ? "Membuat…" : "Buat draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
