"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faSpinner } from "@fortawesome/free-solid-svg-icons";

export type AssetFormValues = {
  name: string;
  code: string;
  description: string;
  quantity: number;
  condition: "GOOD" | "NEEDS_REPAIR" | "BROKEN" | "DISPOSED";
  acquiredCost: number;
};

export function AssetForm({
  initial,
  onSubmit,
  submittingLabel = "Menyimpan…",
  submitLabel = "Simpan",
}: {
  initial: AssetFormValues;
  onSubmit: (values: AssetFormValues) => Promise<void>;
  submittingLabel?: string;
  submitLabel?: string;
}) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof AssetFormValues>(key: K, val: AssetFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handle() {
    setBusy(true);
    try {
      await onSubmit(values);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="a-code">Kode</Label>
          <Input id="a-code" value={values.code} onChange={(e) => set("code", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-qty">Qty</Label>
          <Input
            id="a-qty"
            type="number"
            min={0}
            value={values.quantity}
            onChange={(e) => set("quantity", Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="a-name">Nama aset</Label>
        <Input id="a-name" value={values.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="a-desc">Deskripsi</Label>
        <Textarea id="a-desc" rows={2} value={values.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Kondisi</Label>
          <Select value={values.condition} onValueChange={(v) => set("condition", v as AssetFormValues["condition"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GOOD">Baik</SelectItem>
              <SelectItem value="NEEDS_REPAIR">Perlu perbaikan</SelectItem>
              <SelectItem value="BROKEN">Rusak</SelectItem>
              <SelectItem value="DISPOSED">Dimusnahkan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-cost">Harga satuan (Rp)</Label>
          <Input
            id="a-cost"
            type="number"
            min={0}
            value={values.acquiredCost}
            onChange={(e) => set("acquiredCost", Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button onClick={handle} disabled={busy}>
          <FontAwesomeIcon icon={busy ? faSpinner : faFloppyDisk} className={busy ? "animate-spin" : ""} />
          {busy ? submittingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
