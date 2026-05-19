"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faSpinner } from "@fortawesome/free-solid-svg-icons";

export type UserFormValues = {
  name: string;
  email: string;
  password?: string; // hanya saat create
  role: "SUPERADMIN" | "LAB_ADMIN" | "PROCTOR" | "MAHASISWA";
  nim: string;
  prodi: string;
  angkatan: number | null;
  isActive: boolean;
  customRoleIds: string[];
};

export type CustomRoleOpt = { id: string; key: string; name: string; isSystem: boolean };

export function UserForm({
  initial,
  customRoles,
  showPassword = false,
  onSubmit,
  submitLabel = "Simpan",
  submittingLabel = "Menyimpan…",
}: {
  initial: UserFormValues;
  customRoles: CustomRoleOpt[];
  showPassword?: boolean;
  onSubmit: (v: UserFormValues) => Promise<void>;
  submitLabel?: string;
  submittingLabel?: string;
}) {
  const [v, setV] = useState<UserFormValues>(initial);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof UserFormValues>(k: K, val: UserFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  function toggleRole(id: string) {
    setV((s) => ({
      ...s,
      customRoleIds: s.customRoleIds.includes(id)
        ? s.customRoleIds.filter((x) => x !== id)
        : [...s.customRoleIds, id],
    }));
  }

  async function handle() {
    setBusy(true);
    try {
      await onSubmit(v);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="u-name">Nama lengkap</Label>
          <Input id="u-name" value={v.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="u-email">Email</Label>
          <Input
            id="u-email"
            type="email"
            value={v.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>

      {showPassword && (
        <div className="space-y-1.5">
          <Label htmlFor="u-pwd">Password awal</Label>
          <Input
            id="u-pwd"
            type="password"
            value={v.password ?? ""}
            onChange={(e) => set("password", e.target.value)}
            placeholder="min. 8 karakter"
          />
          <p className="text-[10px] text-muted-foreground">
            Pengguna sebaiknya mengganti password ini setelah login pertama.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label>Role bawaan</Label>
          <Select value={v.role} onValueChange={(val) => set("role", val as UserFormValues["role"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
              <SelectItem value="LAB_ADMIN">Lab Admin</SelectItem>
              <SelectItem value="PROCTOR">Proctor</SelectItem>
              <SelectItem value="MAHASISWA">Mahasiswa</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Menentukan navigasi default & system role yang otomatis aktif.
          </p>
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="u-nim">NIM (opsional)</Label>
          <Input id="u-nim" value={v.nim} onChange={(e) => set("nim", e.target.value)} placeholder="hanya angka" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="u-prodi">Prodi (opsional)</Label>
          <Input id="u-prodi" value={v.prodi} onChange={(e) => set("prodi", e.target.value)} />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="u-ang">Angkatan (opsional)</Label>
          <Input
            id="u-ang"
            type="number"
            value={v.angkatan ?? ""}
            onChange={(e) => set("angkatan", e.target.value ? Number(e.target.value) : null)}
            placeholder={String(new Date().getFullYear())}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Custom role (opsional, bisa banyak)</Label>
        <div className="max-h-44 overflow-y-auto rounded-md border p-2 space-y-1">
          {customRoles.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Belum ada custom role.</p>
          )}
          {customRoles.map((cr) => (
            <label key={cr.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={v.customRoleIds.includes(cr.id)}
                onChange={() => toggleRole(cr.id)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="font-medium">{cr.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{cr.key}</span>
              {cr.isSystem && <span className="text-[10px] text-amber-500">(bawaan)</span>}
            </label>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Custom role akan menambah/menahan permission di atas role bawaan. Kosongkan untuk pakai default saja.
        </p>
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Aktif (boleh login)
      </label>

      <div className="flex justify-end pt-2">
        <Button onClick={handle} disabled={busy}>
          <FontAwesomeIcon icon={busy ? faSpinner : faFloppyDisk} className={busy ? "animate-spin" : ""} />
          {busy ? submittingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
