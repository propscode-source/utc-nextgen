import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPoints } from "@/lib/utils";
import { EVENT_STATUS_LABEL, EVENT_STATUS_VARIANT, isAttendanceOpen } from "@/lib/events";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faLocationDot, faCoins, faCheck } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Event & Kampanye" };

export default async function EventsPage() {
  const session = await auth();
  if (!session) return null;

  const now = new Date();
  const events = await prisma.event.findMany({
    where: { status: { in: ["PUBLISHED", "ONGOING", "COMPLETED"] } },
    orderBy: [{ status: "asc" }, { startsAt: "desc" }],
    take: 50,
    include: {
      lab: { select: { name: true } },
      attendances: { where: { userId: session.user.id }, select: { id: true } },
      _count: { select: { attendances: true } },
    },
  });

  const upcoming = events.filter((e) => e.endsAt >= now && e.status !== "COMPLETED");
  const past = events.filter((e) => e.endsAt < now || e.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Event & Kampanye</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hadiri event aktif, isi presensi saat berlangsung, dan dapatkan poin tambahan.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Akan datang & berlangsung
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Belum ada event aktif.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => {
              const attended = e.attendances.length > 0;
              const open = isAttendanceOpen(e, now);
              return (
                <Link
                  key={e.id}
                  href={`/events/${e.slug}`}
                  className="group rounded-lg border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight group-hover:text-primary line-clamp-2">
                      {e.title}
                    </h3>
                    <Badge variant={EVENT_STATUS_VARIANT[e.status]} className="shrink-0">
                      {EVENT_STATUS_LABEL[e.status]}
                    </Badge>
                  </div>
                  {e.lab && <div className="mt-1 text-xs text-muted-foreground">{e.lab.name}</div>}
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faCalendarDays} className="h-3 w-3" />
                      {formatDate(e.startsAt)}
                    </div>
                    {e.location && (
                      <div className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3" />
                        {e.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-amber-500">
                      <FontAwesomeIcon icon={faCoins} className="h-3 w-3" />
                      +{formatPoints(e.pointReward)} poin
                    </div>
                  </div>
                  <div className="mt-3">
                    {attended ? (
                      <Badge variant="success">
                        <FontAwesomeIcon icon={faCheck} className="h-3 w-3 mr-1" /> Sudah presensi
                      </Badge>
                    ) : open ? (
                      <Badge variant="warning">Presensi terbuka</Badge>
                    ) : (
                      <Badge variant="outline">Presensi belum dibuka</Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Event sebelumnya
          </h2>
          <Card>
            <CardContent className="p-3 divide-y">
              {past.map((e) => {
                const attended = e.attendances.length > 0;
                return (
                  <Link
                    key={e.id}
                    href={`/events/${e.slug}`}
                    className="flex items-center justify-between gap-3 py-2 hover:bg-accent/50 px-2 rounded -mx-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(e.startsAt)} · {e._count.attendances} peserta
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {attended && (
                        <Badge variant="success" className="text-[10px]">
                          Hadir
                        </Badge>
                      )}
                      <Badge variant={EVENT_STATUS_VARIANT[e.status]} className="text-[10px]">
                        {EVENT_STATUS_LABEL[e.status]}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
