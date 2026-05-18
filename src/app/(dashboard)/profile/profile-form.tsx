"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/zod-schemas";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faSpinner } from "@fortawesome/free-solid-svg-icons";

type Initial = {
  name: string;
  email: string;
  nim: string;
  prodi: string;
  angkatan: number;
  image: string;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const { update } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: initial.name,
      prodi: initial.prodi,
      angkatan: initial.angkatan,
      image: initial.image || null,
    },
  });

  async function onSubmit(values: ProfileUpdateInput) {
    setSubmitting(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error || "Gagal menyimpan.");
      return;
    }
    toast.success("Profil tersimpan.");
    await update();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5 md:col-span-2">
        <Label>Email</Label>
        <Input value={initial.email} disabled readOnly />
        <p className="text-[11px] text-muted-foreground">Email tidak dapat diubah.</p>
      </div>
      <div className="space-y-1.5">
        <Label>NIM</Label>
        <Input value={initial.nim} disabled readOnly />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="angkatan">Angkatan</Label>
        <Input id="angkatan" type="number" {...register("angkatan", { valueAsNumber: true })} />
        {errors.angkatan && <p className="text-xs text-destructive">{errors.angkatan.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Nama</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="prodi">Program studi</Label>
        <Input id="prodi" {...register("prodi")} />
        {errors.prodi && <p className="text-xs text-destructive">{errors.prodi.message}</p>}
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="image">Foto profil (URL)</Label>
        <Input id="image" placeholder="https://…" {...register("image")} />
        <p className="text-[11px] text-muted-foreground">
          Menambahkan upload langsung via Uploadthing.
        </p>
        {errors.image && <p className="text-xs text-destructive">{errors.image.message}</p>}
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting}>
          <FontAwesomeIcon icon={submitting ? faSpinner : faFloppyDisk} className={submitting ? "animate-spin" : ""} />
          {submitting ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}
