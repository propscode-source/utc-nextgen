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
import { MerchForm, type MerchFormValues } from "./merch-form";

export function MerchCreateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function create(v: MerchFormValues) {
    if (v.name.trim().length < 2) {
      toast.error("Nama minimal 2 karakter.");
      return;
    }
    const res = await fetch("/api/merch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal membuat.");
      return;
    }
    toast.success("Merchandise dibuat.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlus} /> Item baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah merchandise</DialogTitle>
        </DialogHeader>
        <MerchForm
          initial={{
            name: "",
            slug: "",
            description: "",
            imageUrl: "",
            pointPrice: 100,
            stock: -1,
            active: true,
            kind: "PHYSICAL",
          }}
          showSlug
          onSubmit={create}
          submitLabel="Tambah"
          submittingLabel="Menambah…"
        />
      </DialogContent>
    </Dialog>
  );
}
