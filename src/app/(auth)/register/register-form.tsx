"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerSchema, type RegisterInput } from "@/lib/zod-schemas";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faUserPlus,
  faGraduationCap,
  faPenToSquare,
  faIdCard,
  faCalendarDay,
  faUser,
  faEnvelope,
  faLock,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// Fixed prodi options (Fasilkom Unsri). "LAINNYA" triggers manual input.
const PRODI_OPTIONS = [
  "Teknik Informatika",
  "Sistem Informasi",
  "Sistem Komputer",
  "Manajemen Informatika",
  "Teknik Komputer",
  "Komputerisasi Akutansi",
] as const;

const LAINNYA = "Lainnya";

export function RegisterForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // UI-only state: which dropdown entry is selected; the actual `prodi`
  // form value will be the string itself, or the manual input when "Lainnya".
  const [prodiChoice, setProdiChoice] = useState<string>("");
  const [prodiOther, setProdiOther] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { angkatan: new Date().getFullYear(), prodi: "" },
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
          <IconLabel htmlFor="nim" icon={faIdCard}>NIM</IconLabel>
          <Input id="nim" inputMode="numeric" {...register("nim")} />
          {errors.nim && <p className="text-xs text-destructive">{errors.nim.message}</p>}
        </div>
        <div className="space-y-1.5">
          <IconLabel htmlFor="angkatan" icon={faCalendarDay}>Angkatan</IconLabel>
          <Input
            id="angkatan"
            type="number"
            {...register("angkatan", { valueAsNumber: true })}
          />
          {errors.angkatan && <p className="text-xs text-destructive">{errors.angkatan.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <IconLabel htmlFor="name" icon={faUser}>Nama lengkap</IconLabel>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Program studi — selection box with optional manual input */}
      <div className="space-y-1.5">
        <IconLabel htmlFor="prodi" icon={faGraduationCap}>Program studi</IconLabel>

        {/* Hidden register so RHF validates prodi value */}
        <input type="hidden" {...register("prodi")} />

        <Controller
          name="prodi"
          control={control}
          render={() => (
            <Select
              value={prodiChoice}
              onValueChange={(v) => {
                setProdiChoice(v);
                if (v === LAINNYA) {
                  // commit any existing manual text; clear if empty
                  setValue("prodi", prodiOther, { shouldValidate: true });
                } else {
                  setValue("prodi", v, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger
                id="prodi"
                className="h-10 bg-card font-medium data-[placeholder]:text-muted-foreground data-[placeholder]:font-normal"
              >
                <SelectValue placeholder="Pilih program studi…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {PRODI_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
                <div className="my-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <SelectItem value={LAINNYA}>
                  <span className="inline-flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3 opacity-70" />
                    Lainnya (isi manual)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />

        {/* Manual input — only when "Lainnya" picked */}
        {prodiChoice === LAINNYA && (
          <div className="mt-2 rounded-md border border-primary/20 bg-primary/[.04] p-2.5">
            <Label
              htmlFor="prodi-other"
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary"
            >
              <FontAwesomeIcon icon={faPenToSquare} className="h-2.5 w-2.5" />
              Tulis nama program studi
            </Label>
            <Input
              id="prodi-other"
              autoFocus
              placeholder="Contoh: Teknik Elektro"
              value={prodiOther}
              onChange={(e) => {
                const v = e.target.value;
                setProdiOther(v);
                setValue("prodi", v, { shouldValidate: true });
              }}
              className="mt-1.5 bg-background"
            />
          </div>
        )}

        {errors.prodi && <p className="text-xs text-destructive">{errors.prodi.message}</p>}
      </div>

      <div className="space-y-1.5">
        <IconLabel htmlFor="email" icon={faEnvelope}>Email</IconLabel>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <IconLabel htmlFor="password" icon={faLock}>Password</IconLabel>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <IconLabel htmlFor="confirmPassword" icon={faShieldHalved}>Konfirmasi</IconLabel>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>
      <Button type="submit" className="w-full tech-glow" disabled={submitting}>
        <FontAwesomeIcon icon={submitting ? faSpinner : faUserPlus} className={submitting ? "animate-spin" : ""} />
        {submitting ? "Membuat akun…" : "Daftar (+100 poin)"}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Dengan mendaftar, kamu menyetujui pemakaian data akademik untuk keperluan pelatihan internal Unsri.
      </p>
    </form>
  );
}

/** Label with a small leading icon (IT theme accent). */
function IconLabel({
  htmlFor,
  icon,
  children,
}: {
  htmlFor: string;
  icon: IconDefinition;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
      <FontAwesomeIcon icon={icon} className="h-3 w-3 text-primary" />
      {children}
    </Label>
  );
}
