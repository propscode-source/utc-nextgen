"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStopwatch,
  faTriangleExclamation,
  faCircleCheck,
  faCircleXmark,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

type S = {
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
  user: { id: string; name: string; email: string; nim: string | null; image: string | null };
  quiz: { id: string; title: string; kind: string; course: { title: string; slug: string } | null };
};

const STATUS_VARIANT: Record<string, "outline" | "info" | "success" | "destructive" | "warning"> = {
  ACTIVE: "info",
  SUBMITTED: "success",
  FORCE_ENDED: "destructive",
  EXPIRED: "warning",
  SCHEDULED: "outline",
};

function fmtRemaining(ms: number) {
  if (ms <= 0) return "00:00";
  const t = Math.ceil(ms / 1000);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SessionsTable({ scope }: { scope: "active" | "recent" }) {
  const [data, setData] = useState<S[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    async function fetchData() {
      try {
        const res = await fetch(`/api/exam-sessions?scope=${scope}`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { sessions: S[] };
        if (!stop) {
          setData(body.sessions);
          setLoading(false);
        }
      } catch {}
    }
    fetchData();
    const poll = setInterval(fetchData, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stop = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [scope]);

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href="/proctor/sessions"
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
            scope === "active" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
          )}
        >
          Aktif
        </Link>
        <Link
          href="/proctor/sessions?scope=recent"
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
            scope === "recent" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
          )}
        >
          Riwayat
        </Link>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? "memuat…" : `${data.length} sesi`}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>Ujian</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sisa waktu</TableHead>
                <TableHead className="text-right">Pelanggaran</TableHead>
                <TableHead className="text-right">Skor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    <FontAwesomeIcon icon={faShieldHalved} className="h-8 w-8 mb-2 text-muted-foreground" />
                    <div>{scope === "active" ? "Tidak ada sesi aktif." : "Belum ada riwayat."}</div>
                  </TableCell>
                </TableRow>
              )}
              {data.map((s) => {
                const initials = s.user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                const remainingMs = s.endsAt && s.status === "ACTIVE" ? new Date(s.endsAt).getTime() - now : 0;
                const violationDanger = s.violationCount >= s.maxViolations - 1;
                return (
                  <TableRow key={s.id} className="hover:bg-accent/50">
                    <TableCell>
                      <Link href={`/proctor/sessions/${s.id}`} className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8">
                          {s.user.image && <AvatarImage src={s.user.image} alt={s.user.name} />}
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.user.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {s.user.nim ? `${s.user.nim} · ` : ""}
                            {s.user.email}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{s.quiz.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] mr-1">
                          {s.quiz.kind}
                        </Badge>
                        {s.quiz.course?.title ?? ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[s.status]} className="text-[10px]">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status === "ACTIVE" ? (
                        <span
                          className={cn(
                            "font-mono tabular-nums text-sm",
                            remainingMs < 60000 && "text-destructive animate-pulse"
                          )}
                        >
                          <FontAwesomeIcon icon={faStopwatch} className="mr-1 h-3 w-3" />
                          {fmtRemaining(remainingMs)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={s.violationCount === 0 ? "outline" : violationDanger ? "destructive" : "warning"}
                        className="text-[10px]"
                      >
                        <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1 h-2.5 w-2.5" />
                        {s.violationCount}/{s.maxViolations}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.score !== null ? (
                        <span className="inline-flex items-center gap-1">
                          <FontAwesomeIcon
                            icon={s.passed ? faCircleCheck : faCircleXmark}
                            className={s.passed ? "text-emerald-500 h-3 w-3" : "text-destructive h-3 w-3"}
                          />
                          <span className="font-mono tabular-nums">{s.score}%</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
