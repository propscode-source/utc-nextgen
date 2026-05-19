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
  faKey,
  faShieldHalved,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { UserForm, type UserFormValues, type CustomRoleOpt } from "./user-form";

type User = {
  id: string;
  name: string;
  email: string;
  nim: string | null;
  prodi: string | null;
  angkatan: number | null;
  role: "SUPERADMIN" | "LAB_ADMIN" | "PROCTOR" | "MAHASISWA";
  isActive: boolean;
  customRoleIds: string[];
};

export function UserRowActions({
  user,
  isSelf,
  customRoles,
}: {
  user: User;
  isSelf: boolean;
  customRoles: CustomRoleOpt[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(v: UserFormValues) {
    // 1. update field user
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: v.name,
        email: v.email,
        nim: v.nim.trim() || null,
        prodi: v.prodi.trim() || null,
        angkatan: v.angkatan,
        role: v.role,
        isActive: v.isActive,
      }),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menyimpan.");
      return;
    }
    // 2. sync custom roles
    const res2 = await fetch(`/api/admin/users/${user.id}/custom-roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customRoleIds: v.customRoleIds }),
    });
    if (!res2.ok) {
      const b = (await res2.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Pengguna tersimpan tapi gagal update custom role.");
      return;
    }
    toast.success("Pengguna tersimpan.");
    setEditOpen(false);
    router.refresh();
  }

  async function toggleActive() {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal toggle.");
      return;
    }
    toast.success(user.isActive ? "Pengguna dinonaktifkan." : "Pengguna diaktifkan.");
    router.refresh();
  }

  async function resetPwd() {
    if (newPwd.length < 8) {
      toast.error("Password minimal 8 karakter.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPwd }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal reset.");
      return;
    }
    toast.success("Password berhasil di-reset.");
    setPwdOpen(false);
    setNewPwd("");
  }

  async function destroy() {
    if (!confirm(`Hapus akun "${user.name}" permanen? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menghapus.");
      return;
    }
    toast.success("Pengguna dihapus.");
    router.refresh();
  }

  const initial: UserFormValues = {
    name: user.name,
    email: user.email,
    role: user.role,
    nim: user.nim ?? "",
    prodi: user.prodi ?? "",
    angkatan: user.angkatan,
    isActive: user.isActive,
    customRoleIds: user.customRoleIds,
  };

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
            <FontAwesomeIcon icon={faPenToSquare} /> Edit & assign role
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPwdOpen(true)}>
            <FontAwesomeIcon icon={faKey} /> Reset password
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleActive} disabled={isSelf}>
            <FontAwesomeIcon icon={user.isActive ? faToggleOff : faToggleOn} />
            {user.isActive ? "Non-aktifkan" : "Aktifkan"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={destroy} disabled={isSelf}>
            <FontAwesomeIcon icon={faTrash} /> Hapus pengguna
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <FontAwesomeIcon icon={faShieldHalved} className="mr-2" />
              Edit pengguna
            </DialogTitle>
          </DialogHeader>
          <UserForm initial={initial} customRoles={customRoles} onSubmit={update} />
        </DialogContent>
      </Dialog>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password — {user.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="np">Password baru</Label>
            <Input
              id="np"
              type="password"
              autoFocus
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="min. 8 karakter"
            />
            <p className="text-[11px] text-muted-foreground">
              Beritahukan password ini ke pengguna melalui channel aman. Mintalah pengguna mengganti
              password ini segera setelah login.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={resetPwd} disabled={busy}>
              <FontAwesomeIcon icon={busy ? faSpinner : faKey} className={busy ? "animate-spin" : ""} />
              {busy ? "Menyimpan…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
