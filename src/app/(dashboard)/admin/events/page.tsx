import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { EventCreateButton } from "./event-create-button";
import { EventTable, type EventTableItem } from "./event-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullhorn, faCalendarCheck, faCoins } from "@fortawesome/free-solid-svg-icons";
import { formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Kelola Event" };

export default async function ManageEventsPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "LAB_ADMIN") {
    redirect("/dashboard");
  }

  const [events, labs] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startsAt: "desc" },
      include: {
        lab: { select: { id: true, name: true } },
        _count: { select: { attendances: true } },
      },
    }),
    prisma.lab.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalUpcoming = events.filter(
    (e) => e.status === "PUBLISHED" || e.status === "ONGOING"
  ).length;
  const totalAttendances = events.reduce((s, e) => s + e._count.attendances, 0);
  const totalPointsBudget = events.reduce(
    (s, e) => s + e.pointReward * e._count.attendances,
    0
  );

  const tableItems: EventTableItem[] = events.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description,
    posterUrl: e.posterUrl,
    location: e.location,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    attendanceOpensAt: e.attendanceOpensAt,
    attendanceClosesAt: e.attendanceClosesAt,
    attendanceCode: e.attendanceCode,
    pointReward: e.pointReward,
    status: e.status,
    isPublic: e.isPublic,
    labId: e.labId,
    labName: e.lab?.name ?? null,
    finalizedAt: e.finalizedAt,
    attendanceCount: e._count.attendances,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Event & Kampanye</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buat acara, atur jadwal presensi, dan bagikan poin reward ke peserta saat event selesai.
          </p>
        </div>
        <EventCreateButton labs={labs} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faBullhorn} className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Event akan datang</div>
              <div className="text-lg font-bold">{totalUpcoming} / {events.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500/10 text-emerald-500">
              <FontAwesomeIcon icon={faCalendarCheck} className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Total presensi</div>
              <div className="text-lg font-bold">{totalAttendances}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-amber-500/10 text-amber-500">
              <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Estimasi poin terbagi</div>
              <div className="text-lg font-bold">{formatPoints(totalPointsBudget)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EventTable items={tableItems} labs={labs} />
    </div>
  );
}
