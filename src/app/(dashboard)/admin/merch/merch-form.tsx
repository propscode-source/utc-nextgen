"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faSpinner } from "@fortawesome/free-solid-svg-icons";

export type MerchKind = "PHYSICAL" | "VOUCHER";

export type MerchFormValues = {
  name: string;
  slug?: string;
  description: string;
  imageUrl: string;
  pointPrice: number;
  stock: number;
  active: boolean;
  kind: MerchKind;
};

export function MerchForm({
  initial,
  onSubmit,
  showSlug = false,
  submitLabel = "Simpan",
  submittingLabel = "Menyimpan…",
}: {
  initial: MerchFormValues;
  onSubmit: (v: MerchFormValues) => Promise<void>;
  showSlug?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof MerchFormValues>(k: K, val: MerchFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }));
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
          <Label htmlFor="m-name">Nama produk</Label>
          <Input id="m-name" value={v.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label>Tipe</Label>
          <Select value={v.kind} onValueChange={(val) => set("kind", val as MerchKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PHYSICAL">Barang fisik</SelectItem>
              <SelectItem value="VOUCHER">Voucher digital</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            {v.kind === "VOUCHER"
              ? "Admin akan input kode voucher saat memproses penukaran."
              : "Bisa diambil di kantor atau dikirim (biaya kirim ditanggung user)."}
          </p>
        </div>
      </div>
      {showSlug && (
        <div className="space-y-1.5">
          <Label htmlFor="m-slug">Slug (opsional, auto)</Label>
          <Input
            id="m-slug"
            value={v.slug ?? ""}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="auto-dari-nama"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="m-desc">Deskripsi</Label>
        <Textarea id="m-desc" rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-img">URL gambar (opsional)</Label>
        <Input
          id="m-img"
          placeholder="https://…"
          value={v.imageUrl}
          onChange={(e) => set("imageUrl", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="m-price">Harga (poin)</Label>
          <Input
            id="m-price"
            type="number"
            min={0}
            value={v.pointPrice}
            onChange={(e) => set("pointPrice", Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-stock">Stok (-1 = unlimited)</Label>
          <Input
            id="m-stock"
            type="number"
            min={-1}
            value={v.stock}
            onChange={(e) => set("stock", Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.active}
          onChange={(e) => set("active", e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Aktif (tampil di katalog mahasiswa)
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
