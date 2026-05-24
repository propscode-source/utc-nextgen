import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatPoints } from "@/lib/utils";
import { EVENT_STATUS_LABEL, EVENT_STATUS_VARIANT } from "@/lib/events";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCalendarDays, faLocationDot, faCoins, faKey } from "@fortawesome/free-solid-svg-icons";
import { AttendanceManager, type AttendanceRow } from "./attendance-manager";

export const metadata: Metadata = { title: "Presensi Event" };

export default async function EventAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    redirect("/dashboard");
  }

  const ev = await prisma.event.findUnique({
    where: { id },
    include: {
      lab: { select: { name: true } },
      attendances: {
        orderBy: { checkedInAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true, nim: true, prodi: true } } },
      },
    },
  });
  if (!ev) return notFound();

  const rows: AttendanceRow[] = ev.attendances.map((a) => ({
    id: a.id,
    userId: a.userId,
    checkedInAt: a.checkedInAt,
    note: a.note,
    pointsAwarded: a.pointsAwarded,
    awardedAt: a.awardedAt,
    user: a.user,
  }));

  const isFinalized = !!ev.finalizedAt;
  const totalAwarded = rows.reduce((s, r) => s + r.pointsAwarded, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /> Kembali ke daftar event
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{ev.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <Badge variant={EVENT_STATUS_VARIANT[ev.status]}>{EVENT_STATUS_LABEL[ev.status]}</Badge>
              {ev.lab?.name && <span>· {ev.lab.name}</span>}
              {ev.isPublic && <span>· Tampil di landing</span>}
              {isFinalized && <span>· Difinalisasi {formatDate(ev.finalizedAt!)}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faCalendarDays} className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Jadwal</div>
              <div className="text-xs font-medium truncate">{formatDate(ev.startsAt)}</div>
              <div className="text-[10px] text-muted-foreground truncate">→ {formatDate(ev.endsAt)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-sky-500/10 text-sky-500">
              <FontAwesomeIcon icon={faLocationDot} className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Lokasi</div>
              <div className="text-xs font-medium truncate">{ev.location ?? "—"}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-500/10 text-amber-500">
              <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Reward per peserta</div>
              <div className="text-sm font-bold">+{formatPoints(ev.pointReward)}</div>
              {isFinalized && (
                <div className="text-[10px] text-muted-foreground">Total dibagi: {formatPoints(totalAwarded)}</div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500/10 text-emerald-500">
              <FontAwesomeIcon icon={faKey} className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Kode presensi</div>
              <div className="text-sm font-mono font-bold">{ev.attendanceCode ?? "—"}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AttendanceManager
        eventId={ev.id}
        rows={rows}
        pointReward={ev.pointReward}
        isFinalized={isFinalized}
        status={ev.status}
      />

      {ev.description && (
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground tracking-wide mb-2">Deskripsi</div>
            <p className="text-sm whitespace-pre-wrap">{ev.description}</p>
          </CardContent>
        </Card>
      )}

      {!isFinalized && rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Klik tombol <strong>Finalisasi & Bagikan Poin</strong> di atas untuk mendistribusikan{" "}
          <strong>+{ev.pointReward} poin</strong> ke {rows.length} peserta. Operasi ini idempoten — boleh
          dijalankan ulang jika menambah peserta nanti, asal event belum di-set CANCELLED.
        </p>
      )}

      {isFinalized && (
        <div className="rounded-md border bg-emerald-500/5 border-emerald-500/30 p-4">
          <div className="font-semibold text-emerald-700 dark:text-emerald-300">
            Event sudah difinalisasi.
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total {formatPoints(totalAwarded)} poin telah dibagikan ke {rows.length} peserta pada{" "}
            {formatDate(ev.finalizedAt!)}.
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href="/admin/events">Selesai</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
