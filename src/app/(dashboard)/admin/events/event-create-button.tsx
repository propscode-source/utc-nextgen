"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { EventForm, type EventFormValues } from "./event-form";

export function EventCreateButton({ labs }: { labs: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function create(v: EventFormValues) {
    if (v.title.trim().length < 3) {
      toast.error("Judul minimal 3 karakter.");
      return;
    }
    if (!v.startsAt || !v.endsAt) {
      toast.error("Waktu mulai dan selesai wajib diisi.");
      return;
    }
    const body = {
      ...v,
      slug: v.slug || undefined,
      description: v.description || undefined,
      posterUrl: v.posterUrl || undefined,
      location: v.location || undefined,
      attendanceOpensAt: v.attendanceOpensAt || null,
      attendanceClosesAt: v.attendanceClosesAt || null,
      attendanceCode: v.attendanceCode || null,
      labId: v.labId || null,
    };
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal membuat event.");
      return;
    }
    toast.success("Event dibuat.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlus} /> Event baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah event / kampanye</DialogTitle>
        </DialogHeader>
        <EventForm
          initial={{
            title: "",
            slug: "",
            description: "",
            posterUrl: "",
            location: "",
            startsAt: "",
            endsAt: "",
            attendanceOpensAt: "",
            attendanceClosesAt: "",
            attendanceCode: "",
            pointReward: 50,
            status: "DRAFT",
            isPublic: true,
            labId: "",
          }}
          labs={labs}
          showSlug
          onSubmit={create}
          submitLabel="Tambah"
          submittingLabel="Menambah…"
        />
      </DialogContent>
    </Dialog>
  );
}
