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
  faToggleOn,
  faToggleOff,
} from "@fortawesome/free-solid-svg-icons";
import { MerchForm, type MerchFormValues } from "./merch-form";

type Item = MerchFormValues & { id: string; hasRedemptions: boolean };

export function MerchRowActions({ item }: { item: Item }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function update(v: MerchFormValues) {
    const res = await fetch(`/api/merch/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menyimpan.");
      return;
    }
    toast.success("Tersimpan.");
    setEditOpen(false);
    router.refresh();
  }

  async function toggleActive() {
    setBusy(true);
    const res = await fetch(`/api/merch/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Gagal toggle.");
      return;
    }
    toast.success(item.active ? "Item dinonaktifkan." : "Item diaktifkan.");
    router.refresh();
  }

  async function destroy() {
    if (!confirm(`Hapus "${item.name}" permanen?`)) return;
    setBusy(true);
    const res = await fetch(`/api/merch/${item.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menghapus.");
      return;
    }
    toast.success("Item dihapus.");
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
          <DropdownMenuItem onSelect={toggleActive}>
            <FontAwesomeIcon icon={item.active ? faToggleOff : faToggleOn} />
            {item.active ? "Non-aktifkan" : "Aktifkan"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={destroy}
            disabled={item.hasRedemptions}
          >
            <FontAwesomeIcon icon={faTrash} />
            {item.hasRedemptions ? "Hapus (terkunci, ada riwayat)" : "Hapus"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit merchandise</DialogTitle>
          </DialogHeader>
          <MerchForm initial={item} onSubmit={update} />
        </DialogContent>
      </Dialog>
    </>
  );
}
