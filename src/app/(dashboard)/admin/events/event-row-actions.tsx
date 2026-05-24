"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  faClipboardCheck,
} from "@fortawesome/free-solid-svg-icons";
import { EventForm, type EventFormValues, toLocalInput } from "./event-form";
import type { EventTableItem } from "./event-table";

export function EventRowActions({
  item,
  labs,
}: {
  item: EventTableItem;
  labs: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const initial: EventFormValues = {
    title: item.title,
    description: item.description ?? "",
    posterUrl: item.posterUrl ?? "",
    location: item.location ?? "",
    startsAt: toLocalInput(item.startsAt),
    endsAt: toLocalInput(item.endsAt),
    attendanceOpensAt: toLocalInput(item.attendanceOpensAt),
    attendanceClosesAt: toLocalInput(item.attendanceClosesAt),
    attendanceCode: item.attendanceCode ?? "",
    pointReward: item.pointReward,
    status: item.status,
    isPublic: item.isPublic,
    labId: item.labId ?? "",
  };

  async function update(v: EventFormValues) {
    const body = {
      ...v,
      description: v.description || null,
      posterUrl: v.posterUrl || null,
      location: v.location || null,
      attendanceOpensAt: v.attendanceOpensAt || null,
      attendanceClosesAt: v.attendanceClosesAt || null,
      attendanceCode: v.attendanceCode || null,
      labId: v.labId || null,
    };
    const res = await fetch(`/api/events/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  async function destroy() {
    if (!confirm(`Hapus event "${item.title}" permanen?`)) return;
    setBusy(true);
    const res = await fetch(`/api/events/${item.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menghapus.");
      return;
    }
    toast.success("Event dihapus.");
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
          <DropdownMenuItem asChild>
            <Link href={`/admin/events/${item.id}`}>
              <FontAwesomeIcon icon={faClipboardCheck} /> Kelola presensi
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <FontAwesomeIcon icon={faPenToSquare} /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={destroy}>
            <FontAwesomeIcon icon={faTrash} /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit event</DialogTitle>
          </DialogHeader>
          <EventForm initial={initial} labs={labs} onSubmit={update} />
        </DialogContent>
      </Dialog>
    </>
  );
}
