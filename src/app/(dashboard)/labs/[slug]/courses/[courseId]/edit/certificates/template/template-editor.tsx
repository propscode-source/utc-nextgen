"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CertificateDocument } from "@/components/certificate-document";
import { DEFAULT_TEMPLATE_FIELDS, type CertField, type CertFieldKey } from "@/lib/cert-template";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFloppyDisk,
  faSpinner,
  faPlus,
  faTrash,
  faRotateLeft,
  faArrowsUpDownLeftRight,
  faArrowRotateLeft,
  faArrowRotateRight,
} from "@fortawesome/free-solid-svg-icons";

const FIELD_KEYS: { value: CertFieldKey; label: string }[] = [
  { value: "title", label: "Judul (statis)" },
  { value: "subtitle", label: "Subjudul (statis)" },
  { value: "certNumberLabel", label: "Label nomor sertifikat" },
  { value: "certNumber", label: "Nomor sertifikat (raw)" },
  { value: "intro", label: "Intro (statis)" },
  { value: "recipientName", label: "Nama penerima" },
  { value: "recipientNim", label: "NIM penerima" },
  { value: "body", label: "Body deskripsi" },
  { value: "courseTitle", label: "Judul course" },
  { value: "labName", label: "Nama lab" },
  { value: "issuedAt", label: "Tanggal terbit" },
  { value: "score", label: "Nilai akhir" },
  { value: "passScore", label: "Skor lulus min" },
  { value: "qr", label: "QR Code" },
  { value: "logo", label: "Logo (gambar)" },
  { value: "signature", label: "Tanda tangan (gambar)" },
  { value: "signatureName", label: "Nama penandatangan" },
  { value: "signatureTitle", label: "Jabatan penandatangan" },
  { value: "footer", label: "Footer (statis)" },
  { value: "custom", label: "Custom (text bebas)" },
];

const SAMPLE = {
  recipientName: "Mahasiswa Contoh",
  recipientNim: "09011382326999",
  finalScore: 92,
  certNumber: "FASILKOM-PEL/2025/0001",
};

export function TemplateEditor({
  labSlug,
  courseId,
  courseTitle,
  labName,
  passScore,
  initialBackgroundUrl,
  initialFields,
  initialName,
}: {
  labSlug: string;
  courseId: string;
  courseTitle: string;
  labName: string;
  passScore: number;
  initialBackgroundUrl: string;
  initialFields: CertField[];
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [bg, setBg] = useState(initialBackgroundUrl);
  const [fields, setFields] = useState<CertField[]>(initialFields);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<{ idx: number; rect: DOMRect } | null>(null);

  const template = useMemo(() => ({ backgroundUrl: bg, fields }), [bg, fields]);

  /* ---------- Undo / Redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) ---------- */
  type Snap = { bg: string; fields: CertField[] };
  const [past, setPast] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const bgRef = useRef(bg);
  const fieldsRef = useRef(fields);
  const pastRef = useRef(past);
  const futureRef = useRef(future);
  useEffect(() => { bgRef.current = bg; }, [bg]);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);
  useEffect(() => { pastRef.current = past; }, [past]);
  useEffect(() => { futureRef.current = future; }, [future]);

  // Debounced snapshot — captures BEFORE state at the start of a burst,
  // commits to history once 400ms idle. Drag/typing/clicking all coalesce to one entry.
  const pendingOld = useRef<Snap | null>(null);
  const snapTimer = useRef<number | null>(null);
  function startMaybeSnapshot() {
    if (!pendingOld.current) {
      pendingOld.current = { bg: bgRef.current, fields: fieldsRef.current };
    }
    if (snapTimer.current) window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => {
      if (pendingOld.current) {
        setPast((p) => [...p.slice(-49), pendingOld.current!]);
        setFuture([]);
        pendingOld.current = null;
      }
    }, 400);
  }
  function flushSnapshotNow() {
    if (snapTimer.current) window.clearTimeout(snapTimer.current);
    if (pendingOld.current) {
      setPast((p) => [...p.slice(-49), pendingOld.current!]);
      setFuture([]);
      pendingOld.current = null;
    }
  }
  function undo() {
    flushSnapshotNow();
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    const current: Snap = { bg: bgRef.current, fields: fieldsRef.current };
    setPast(pastRef.current.slice(0, -1));
    setFuture([current, ...futureRef.current]);
    setBg(prev.bg);
    setFields(prev.fields);
  }
  function redo() {
    if (futureRef.current.length === 0) return;
    const nxt = futureRef.current[0];
    const current: Snap = { bg: bgRef.current, fields: fieldsRef.current };
    setFuture(futureRef.current.slice(1));
    setPast([...pastRef.current, current]);
    setBg(nxt.bg);
    setFields(nxt.fields);
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(idx: number, p: Partial<CertField>) {
    startMaybeSnapshot();
    setFields((arr) => arr.map((f, i) => (i === idx ? { ...f, ...p } : f)));
  }

  function add() {
    flushSnapshotNow();
    startMaybeSnapshot();
    setFields((arr) => [
      ...arr,
      {
        key: "custom",
        text: "Teks baru",
        x: 50,
        y: 50,
        fontSize: 16,
        fontWeight: 500,
        color: "#0f172a",
        align: "center",
        width: 60,
      },
    ]);
    setSelected(fields.length);
  }

  function remove(idx: number) {
    flushSnapshotNow();
    startMaybeSnapshot();
    setFields((arr) => arr.filter((_, i) => i !== idx));
    setSelected((s) => Math.max(0, s - 1));
  }

  function reset() {
    if (!confirm("Reset ke default fields?")) return;
    flushSnapshotNow();
    startMaybeSnapshot();
    setFields(DEFAULT_TEMPLATE_FIELDS.slice());
  }

  // Drag-to-position on preview canvas.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = draggingRef.current;
      if (!drag) return;
      const r = drag.rect;
      const px = ((e.clientX - r.left) / r.width) * 100;
      const py = ((e.clientY - r.top) / r.height) * 100;
      patch(drag.idx, { x: Math.max(0, Math.min(100, px)), y: Math.max(0, Math.min(100, py)) });
    }
    function onUp() {
      draggingRef.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startDrag(e: React.MouseEvent, idx: number) {
    if (!previewRef.current) return;
    setSelected(idx);
    flushSnapshotNow();
    startMaybeSnapshot(); // capture pre-drag state once
    draggingRef.current = { idx, rect: previewRef.current.getBoundingClientRect() };
    e.preventDefault();
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/courses/${courseId}/certificate-template`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, backgroundUrl: bg, fields }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menyimpan template.");
      return;
    }
    toast.success("Template tersimpan.");
    router.refresh();
  }

  async function destroy() {
    if (!confirm("Hapus template? Sertifikat akan kembali ke layout default.")) return;
    setBusy(true);
    const res = await fetch(`/api/courses/${courseId}/certificate-template`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Gagal menghapus.");
      return;
    }
    toast.success("Template dihapus.");
    setBg("");
    setFields(DEFAULT_TEMPLATE_FIELDS.slice());
    router.refresh();
  }

  const f = fields[selected];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link
            href={`/labs/${labSlug}/courses/${courseId}/edit/certificates`}
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Kembali ke list sertifikat
          </Link>
          <h1 className="mt-1 text-xl font-bold tracking-tight">Template sertifikat — {courseTitle}</h1>
          <p className="text-xs text-muted-foreground">
            Geser elemen di preview untuk reposisi, atau atur manual di panel kanan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={past.length === 0}
            title="Undo (Ctrl+Z)"
          >
            <FontAwesomeIcon icon={faArrowRotateLeft} /> Undo
            {past.length > 0 && <span className="text-[10px] text-muted-foreground">({past.length})</span>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={future.length === 0}
            title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
          >
            <FontAwesomeIcon icon={faArrowRotateRight} /> Redo
            {future.length > 0 && <span className="text-[10px] text-muted-foreground">({future.length})</span>}
          </Button>
          <Button variant="outline" size="sm" onClick={reset}>
            <FontAwesomeIcon icon={faRotateLeft} /> Reset default
          </Button>
          <Button variant="destructive" size="sm" onClick={destroy} disabled={busy}>
            <FontAwesomeIcon icon={faTrash} /> Hapus
          </Button>
          <Button onClick={save} disabled={busy}>
            <FontAwesomeIcon icon={busy ? faSpinner : faFloppyDisk} className={busy ? "animate-spin" : ""} />
            Simpan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Preview (sample data)</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {fields.length} field
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bg">URL gambar background (opsional)</Label>
                <Input
                  id="bg"
                  value={bg}
                  onChange={(e) => {
                    startMaybeSnapshot();
                    setBg(e.target.value);
                  }}
                  placeholder="https://… (kosong = pakai border default)"
                />
              </div>
              <div className="relative" ref={previewRef}>
                <CertificateDocument
                  certNumber={SAMPLE.certNumber}
                  recipientName={SAMPLE.recipientName}
                  recipientNim={SAMPLE.recipientNim}
                  courseTitle={courseTitle}
                  labName={labName}
                  issuedAt={new Date()}
                  qrPayload={`https://example.com/cert/${SAMPLE.certNumber}`}
                  passScore={passScore}
                  finalScore={SAMPLE.finalScore}
                  template={template}
                />
                {/* Overlay drag handles */}
                <div className="absolute inset-0">
                  {fields.map((ff, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onMouseDown={(e) => startDrag(e, idx)}
                      title={`${ff.key} — drag`}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center h-5 w-5 rounded-full border-2 cursor-move text-[10px] ${
                        selected === idx
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary/40 bg-white text-primary hover:bg-primary/10"
                      }`}
                      style={{ left: `${ff.x}%`, top: `${ff.y}%` }}
                    >
                      <FontAwesomeIcon icon={faArrowsUpDownLeftRight} className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Field panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Fields</CardTitle>
            <Button size="sm" variant="outline" onClick={add}>
              <FontAwesomeIcon icon={faPlus} /> Field
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tplname">Nama template</Label>
              <Input id="tplname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="border rounded-md max-h-48 overflow-y-auto scrollbar-hide divide-y">
              {fields.map((ff, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelected(idx)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between ${
                    selected === idx ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                  }`}
                >
                  <span className="truncate">
                    <code className="font-mono">{ff.key}</code>
                    {ff.text ? ` — ${ff.text.slice(0, 24)}${ff.text.length > 24 ? "…" : ""}` : ""}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {Math.round(ff.x)},{Math.round(ff.y)}
                  </span>
                </button>
              ))}
            </div>

            {f && (
              <div className="space-y-2 border-t pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Key</Label>
                    <Select value={f.key} onValueChange={(v) => patch(selected, { key: v as CertFieldKey })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_KEYS.map((k) => (
                          <SelectItem key={k.value} value={k.value}>
                            {k.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Align</Label>
                    <Select value={f.align} onValueChange={(v) => patch(selected, { align: v as CertField["align"] })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Text (override / static)</Label>
                  <Input
                    className="h-8"
                    value={f.text ?? ""}
                    onChange={(e) => patch(selected, { text: e.target.value })}
                    placeholder="(kosong = isi otomatis dari data)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberRow label="X (%)" value={f.x} onChange={(n) => patch(selected, { x: n })} />
                  <NumberRow label="Y (%)" value={f.y} onChange={(n) => patch(selected, { y: n })} />
                  <NumberRow label="Font size" value={f.fontSize} onChange={(n) => patch(selected, { fontSize: n })} />
                  <NumberRow label="Weight" value={f.fontWeight} onChange={(n) => patch(selected, { fontWeight: n })} />
                  <NumberRow label="Width %" value={f.width ?? 60} onChange={(n) => patch(selected, { width: n })} />
                  {f.key === "qr" && (
                    <NumberRow
                      label="QR size px"
                      value={f.qrSize ?? 110}
                      onChange={(n) => patch(selected, { qrSize: n })}
                    />
                  )}
                  {(f.key === "logo" || f.key === "signature") && (
                    <NumberRow
                      label="Tinggi gambar px"
                      value={f.imageHeight ?? (f.key === "logo" ? 80 : 60)}
                      onChange={(n) => patch(selected, { imageHeight: n })}
                    />
                  )}
                </div>
                {(f.key === "logo" || f.key === "signature") && (
                  <div className="space-y-1">
                    <Label className="text-[11px]">URL gambar ({f.key})</Label>
                    <Input
                      className="h-8"
                      placeholder="https://… (PNG transparan recommended)"
                      value={f.imageUrl ?? ""}
                      onChange={(e) => patch(selected, { imageUrl: e.target.value })}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Color</Label>
                    <Input
                      className="h-8"
                      type="color"
                      value={f.color}
                      onChange={(e) => patch(selected, { color: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Font family</Label>
                    <Input
                      className="h-8"
                      value={f.fontFamily ?? ""}
                      onChange={(e) => patch(selected, { fontFamily: e.target.value || undefined })}
                      placeholder="serif / sans-serif"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(selected)} className="text-destructive">
                  <FontAwesomeIcon icon={faTrash} /> Hapus field ini
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Input
        className="h-8"
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
