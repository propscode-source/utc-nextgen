"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/lib/zod-schemas";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faUserPlus } from "@fortawesome/free-solid-svg-icons";

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { angkatan: new Date().getFullYear() },
  });

  async function onSubmit(values: RegisterInput) {
    setSubmitting(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error || "Gagal mendaftar.");
      return;
    }

    toast.success("Akun berhasil dibuat. Cek email untuk verifikasi.");
    router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="nim">NIM</Label>
          <Input id="nim" inputMode="numeric" {...register("nim")} />
          {errors.nim && <p className="text-xs text-destructive">{errors.nim.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="angkatan">Angkatan</Label>
          <Input
            id="angkatan"
            type="number"
            {...register("angkatan", { valueAsNumber: true })}
          />
          {errors.angkatan && <p className="text-xs text-destructive">{errors.angkatan.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Nama lengkap</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="prodi">Program studi</Label>
        <Input id="prodi" placeholder="Sistem Informasi" {...register("prodi")} />
        {errors.prodi && <p className="text-xs text-destructive">{errors.prodi.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Konfirmasi</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        <FontAwesomeIcon icon={submitting ? faSpinner : faUserPlus} className={submitting ? "animate-spin" : ""} />
        {submitting ? "Membuat akun…" : "Daftar (+100 poin)"}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Dengan mendaftar, kamu menyetujui pemakaian data akademik untuk keperluan pelatihan internal Unsri.
      </p>
    </form>
  );
}
