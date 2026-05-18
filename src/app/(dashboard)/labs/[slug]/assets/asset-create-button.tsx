"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { AssetForm, type AssetFormValues } from "./asset-form";

export function AssetCreateButton({ labId }: { labId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function create(values: AssetFormValues) {
    const res = await fetch(`/api/labs/${labId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menambah aset.");
      return;
    }
    toast.success("Aset ditambahkan.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlus} /> Tambah aset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah aset baru</DialogTitle>
        </DialogHeader>
        <AssetForm
          initial={{ name: "", code: "", description: "", quantity: 1, condition: "GOOD", acquiredCost: 0 }}
          onSubmit={create}
          submitLabel="Tambah"
          submittingLabel="Menambah…"
        />
      </DialogContent>
    </Dialog>
  );
}
