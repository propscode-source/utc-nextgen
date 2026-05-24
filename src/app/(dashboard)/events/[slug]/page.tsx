import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatPoints } from "@/lib/utils";
import { EVENT_STATUS_LABEL, EVENT_STATUS_VARIANT, isAttendanceOpen } from "@/lib/events";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCalendarDays,
  faLocationDot,
  faCoins,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { CheckInPanel } from "./check-in-panel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ev = await prisma.event.findUnique({ where: { slug }, select: { title: true } });
  return { title: ev?.title ?? "Event" };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const ev = await prisma.event.findUnique({
    where: { slug },
    include: {
      lab: { select: { name: true, slug: true } },
      attendances: {
        where: { userId: session.user.id },
        select: { id: true, checkedInAt: true, pointsAwarded: true, awardedAt: true, note: true },
      },
      _count: { select: { attendances: true } },
    },
  });
  if (!ev) return notFound();

  const myAttendance = ev.attendances[0] ?? null;
  const open = isAttendanceOpen(ev);
  const needsCode = !!ev.attendanceCode;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/events"
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
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faCalendarDays} className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Mulai</div>
              <div className="text-xs font-medium">{formatDate(ev.startsAt)}</div>
              <div className="text-[10px] text-muted-foreground">→ {formatDate(ev.endsAt)}</div>
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
              <div className="text-xs font-medium">{ev.location ?? "—"}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-500/10 text-amber-500">
              <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Reward</div>
              <div className="text-sm font-bold">+{formatPoints(ev.pointReward)} poin</div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <FontAwesomeIcon icon={faUsers} className="h-2.5 w-2.5" />
                {ev._count.attendances} peserta hadir
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {ev.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm whitespace-pre-wrap">{ev.description}</p>
          </CardContent>
        </Card>
      )}

      <CheckInPanel
        eventId={ev.id}
        eventTitle={ev.title}
        open={open}
        needsCode={needsCode}
        myAttendance={
          myAttendance
            ? {
                checkedInAt: myAttendance.checkedInAt,
                pointsAwarded: myAttendance.pointsAwarded,
                awardedAt: myAttendance.awardedAt,
                note: myAttendance.note,
              }
            : null
        }
        status={ev.status}
        pointReward={ev.pointReward}
      />

      {(session.user.role === "SUPERADMIN" || session.user.role === "LAB_ADMIN") && (
        <Card className="border-dashed">
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">Admin shortcut</div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/events/${ev.id}`}>Kelola event</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
