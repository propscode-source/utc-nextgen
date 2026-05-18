"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStopwatch,
  faTriangleExclamation,
  faCircleCheck,
  faCircleXmark,
  faStop,
  faClock,
  faPaperPlane,
  faSpinner,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { cn, formatDate } from "@/lib/utils";

type Detail = {
  id: string;
  status: string;
  startedAt: string | null;
  endsAt: string | null;
  submittedAt: string | null;
  durationSec: number;
  violationCount: number;
  maxViolations: number;
  score: number | null;
  passed: boolean;
  proctorMessage: string | null;
  proctorMessageAt: string | null;
  user: { id: string; name: string; email: string; nim: string | null; prodi: string | null; image: string | null };
  quiz: { id: string; title: string; kind: string; minScore: number; maxViolations: number };
  violations: { id: string; type: string; meta: unknown; occurredAt: string }[];
  snapshots: { id: string; imageUrl: string; capturedAt: string }[];
};

const VIOLATION_LABEL: Record<string, string> = {
  TAB_SWITCH: "Pindah tab/aplikasi",
  FULLSCREEN_EXIT: "Keluar fullscreen",
  COPY_PASTE: "Copy / paste / cut",
  RIGHT_CLICK: "Klik kanan",
  MULTIPLE_FACES: "Banyak wajah",
  NO_FACE: "Wajah tidak terdeteksi",
  OTHER: "Lainnya",
};

function fmtRemaining(ms: number) {
  if (ms <= 0) return "00:00";
  const t = Math.ceil(ms / 1000);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SessionDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<null | string>(null);
  const [warnOpen, setWarnOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [warnMsg, setWarnMsg] = useState("");
  const [extendSec, setExtendSec] = useState(300);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch(`/api/exam-sessions/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as Detail;
        if (!stop) setData(body);
      } catch {}
    }
    load();
    const poll = setInterval(load, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stop = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [id]);

  async function action(payload: Record<string, unknown>, label: string, key: string) {
    setBusy(key);
    const res = await fetch(`/api/exam-sessions/${id}/proctor`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(null);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal.");
      return false;
    }
    toast.success(label);
    router.refresh();
    return true;
  }

  if (!data) {
    return <div className="text-sm text-muted-foreground">Memuat sesi…</div>;
  }

  const initials = data.user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const remainingMs = data.endsAt && data.status === "ACTIVE" ? new Date(data.endsAt).getTime() - now : 0;
  const isActive = data.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/proctor/sessions" className="text-xs text-muted-foreground hover:underline">
          ← Kembali ke daftar sesi
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        {/* Left: identity + controls */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {data.user.image && <AvatarImage src={data.user.image} alt={data.user.name} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-bold truncate">{data.user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {data.user.nim ? `${data.user.nim} · ` : ""}
                    {data.user.email}
                  </div>
                  {data.user.prodi && (
                    <div className="text-[11px] text-muted-foreground">{data.user.prodi}</div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat label="Ujian" value={`${data.quiz.kind} · ${data.quiz.title}`} />
                <Stat label="Status" value={data.status} />
                <Stat
                  label="Sisa waktu"
                  value={
                    isActive ? (
                      <span className={cn("font-mono", remainingMs < 60_000 && "text-destructive")}>
                        <FontAwesomeIcon icon={faStopwatch} className="mr-1" />
                        {fmtRemaining(remainingMs)}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Stat
                  label="Pelanggaran"
                  value={
                    <Badge
                      variant={
                        data.violationCount === 0
                          ? "outline"
                          : data.violationCount >= data.maxViolations - 1
                            ? "destructive"
                            : "warning"
                      }
                      className="text-[10px]"
                    >
                      {data.violationCount}/{data.maxViolations}
                    </Badge>
                  }
                />
                <Stat
                  label="Skor"
                  value={
                    data.score !== null ? (
                      <span className="font-mono">{data.score}%</span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Stat
                  label="Lulus"
                  value={
                    data.score !== null ? (
                      <FontAwesomeIcon
                        icon={data.passed ? faCircleCheck : faCircleXmark}
                        className={data.passed ? "text-emerald-500" : "text-destructive"}
                      />
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Proctor actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aksi proktor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isActive ? (
                <>
                  <Dialog open={warnOpen} onOpenChange={setWarnOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <FontAwesomeIcon icon={faPaperPlane} /> Kirim peringatan
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Kirim peringatan ke {data.user.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-1.5">
                        <Label htmlFor="wm">Pesan</Label>
                        <Textarea
                          id="wm"
                          rows={3}
                          value={warnMsg}
                          onChange={(e) => setWarnMsg(e.target.value)}
                          placeholder="Tolong jangan keluar dari fullscreen…"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setWarnOpen(false)}>
                          Batal
                        </Button>
                        <Button
                          disabled={!warnMsg.trim() || busy === "warn"}
                          onClick={async () => {
                            const ok = await action(
                              { action: "WARN", message: warnMsg.trim() },
                              "Peringatan terkirim.",
                              "warn"
                            );
                            if (ok) {
                              setWarnMsg("");
                              setWarnOpen(false);
                            }
                          }}
                        >
                          <FontAwesomeIcon
                            icon={busy === "warn" ? faSpinner : faPaperPlane}
                            className={busy === "warn" ? "animate-spin" : ""}
                          />
                          Kirim
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <FontAwesomeIcon icon={faClock} /> Tambah waktu
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah waktu ujian</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-1.5">
                        <Label htmlFor="es">Tambah berapa detik</Label>
                        <Input
                          id="es"
                          type="number"
                          min={30}
                          max={3600}
                          value={extendSec}
                          onChange={(e) => setExtendSec(Number(e.target.value) || 300)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          {Math.round(extendSec / 60)} menit. Max 60 menit per kali tambah.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setExtendOpen(false)}>
                          Batal
                        </Button>
                        <Button
                          disabled={busy === "extend"}
                          onClick={async () => {
                            const ok = await action(
                              { action: "EXTEND_TIME", extendSeconds: extendSec },
                              `Waktu ditambah ${Math.round(extendSec / 60)} menit.`,
                              "extend"
                            );
                            if (ok) setExtendOpen(false);
                          }}
                        >
                          <FontAwesomeIcon
                            icon={busy === "extend" ? faSpinner : faClock}
                            className={busy === "extend" ? "animate-spin" : ""}
                          />
                          Tambah
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    disabled={busy === "force"}
                    onClick={async () => {
                      if (!confirm(`Force-end sesi ${data.user.name}?\nJawaban terkini akan disubmit.`))
                        return;
                      await action({ action: "FORCE_END" }, "Sesi di-force-end.", "force");
                    }}
                  >
                    <FontAwesomeIcon icon={busy === "force" ? faSpinner : faStop} className={busy === "force" ? "animate-spin" : ""} />
                    Force-end sesi
                  </Button>

                  {data.proctorMessage && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
                      <div className="flex items-start gap-2">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium">Peringatan terkirim:</div>
                          <div className="text-muted-foreground">{data.proctorMessage}</div>
                        </div>
                        <button
                          onClick={() => action({ action: "CLEAR_WARN" }, "Peringatan dihapus.", "clear")}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Bersihkan"
                        >
                          <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Sesi sudah berakhir, tidak ada aksi tersedia.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: violations + snapshots */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log pelanggaran ({data.violations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.violations.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada pelanggaran.</p>
              ) : (
                <ul className="divide-y text-xs max-h-72 overflow-y-auto scrollbar-hide">
                  {data.violations.map((v) => (
                    <li key={v.id} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{VIOLATION_LABEL[v.type] ?? v.type}</div>
                        <div className="text-muted-foreground">{formatDate(v.occurredAt)}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{v.type}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Snapshot webcam ({data.snapshots.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.snapshots.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada snapshot (atau webcam tidak aktif).</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {data.snapshots.map((s) => (
                    <div key={s.id} className="space-y-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.imageUrl}
                        alt="snapshot"
                        className="aspect-video object-cover rounded-md border"
                      />
                      <div className="text-[10px] text-muted-foreground text-center">
                        {new Date(s.capturedAt).toLocaleTimeString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2 bg-muted/30">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  );
}
