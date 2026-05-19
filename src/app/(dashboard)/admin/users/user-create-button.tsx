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
import { UserForm, type UserFormValues, type CustomRoleOpt } from "./user-form";

export function UserCreateButton({ customRoles }: { customRoles: CustomRoleOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const initial: UserFormValues = {
    name: "",
    email: "",
    password: "",
    role: "MAHASISWA",
    nim: "",
    prodi: "",
    angkatan: null,
    isActive: true,
    customRoleIds: [],
  };

  async function create(v: UserFormValues) {
    if (v.name.trim().length < 2) return toast.error("Nama minimal 2 karakter.");
    if (!v.email.includes("@")) return toast.error("Email tidak valid.");
    if ((v.password ?? "").length < 8) return toast.error("Password minimal 8 karakter.");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: v.name.trim(),
        email: v.email.trim(),
        password: v.password,
        role: v.role,
        nim: v.nim.trim() || null,
        prodi: v.prodi.trim() || null,
        angkatan: v.angkatan,
        isActive: v.isActive,
        customRoleIds: v.customRoleIds,
      }),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal membuat pengguna.");
      return;
    }
    toast.success("Pengguna dibuat.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FontAwesomeIcon icon={faPlus} /> Pengguna baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah pengguna</DialogTitle>
        </DialogHeader>
        <UserForm
          initial={initial}
          customRoles={customRoles}
          showPassword
          onSubmit={create}
          submitLabel="Buat pengguna"
          submittingLabel="Membuat…"
        />
      </DialogContent>
    </Dialog>
  );
}
