import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPoints, formatDate } from "@/lib/utils";
import {
  faUsers,
  faFlask,
  faGraduationCap,
  faCoins,
  faArrowRight,
  faShieldHalved,
  faClipboardCheck,
  faBoxArchive,
  faCircleCheck,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { StatCard, SectionCard, EmptyState, Greeting } from "./_primitives";

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  LAB_ADMIN: "Lab Admin",
  PROCTOR: "Proktor",
  MAHASISWA: "Mahasiswa",
};

export default async function SuperadminDashboard() {
  const session = await auth();
  if (!session) return null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const last7d = new Date();
  last7d.setDate(last7d.getDate() - 7);

  const [
    userCount,
    labCount,
    courseCount,
    pointsAwarded,
    roleAgg,
    topLabs,
    newUsers7d,
    pendingRedemptions,
    pendingEssays,
    activeExams,
    recentRedemptions,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.lab.count(),
    prisma.course.count(),
    prisma.pointsLedger.aggregate({ _sum: { delta: true }, where: { delta: { gt: 0 } } }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
      where: { isActive: true },
    }),
    prisma.lab.findMany({
      orderBy: { courses: { _count: "desc" } },
      take: 5,
      select: {
        id: true,
        slug: true,
        name: true,
        _count: { select: { courses: true, members: true } },
      },
    }),
    prisma.user.count({ where: { createdAt: { gte: last7d } } }),
    prisma.merchRedemption.count({ where: { status: "PENDING" } }),
    prisma.answerSubmission.count({
      where: { essayText: { not: null }, isCorrect: null, attempt: { status: "SUBMITTED" } },
    }),
    prisma.examSession.count({ where: { status: "ACTIVE" } }),
    prisma.merchRedemption.findMany({
      orderBy: { redeemedAt: "desc" },
      take: 5,
      include: {
        user: { select: { name: true } },
        merchItem: { select: { name: true } },
      },
    }),
  ]);

  const totalPoints = pointsAwarded._sum.delta ?? 0;
  const roleMap = Object.fromEntries(roleAgg.map((r) => [r.role, r._count._all]));
  const totalForBar = roleAgg.reduce((sum, r) => sum + r._count._all, 0) || 1;

  return (
    <div className="space-y-6">
      <Greeting
        name={session.user.name}
        subtitle="Pantau kesehatan sistem dan aksi admin yang perlu ditindaklanjuti."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total User"
          value={formatPoints(userCount)}
          hint={`+${newUsers7d} dalam 7 hari`}
          icon={faUsers}
          accent="primary"
        />
        <StatCard label="Total Lab" value={labCount} icon={faFlask} accent="violet" />
        <StatCard label="Total Course" value={courseCount} icon={faGraduationCap} accent="sky" />
        <StatCard
          label="Poin Dibagikan"
          value={formatPoints(totalPoints)}
          icon={faCoins}
          accent="gold"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard
          title="Distribusi Peran"
          description="User aktif per peran."
          className="lg:col-span-2"
        >
          <ul className="space-y-3">
            {(["SUPERADMIN", "LAB_ADMIN", "PROCTOR", "MAHASISWA"] as const).map((r) => {
              const count = roleMap[r] ?? 0;
              const pct = Math.round((count / totalForBar) * 100);
              return (
                <li key={r}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{ROLE_LABEL[r]}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatPoints(count)} <span className="ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <SectionCard
          title="Lab Teraktif"
          description="Berdasarkan jumlah course."
          className="lg:col-span-3"
          action={
            <Link
              href="/labs"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Semua lab <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
            </Link>
          }
        >
          {topLabs.length === 0 ? (
            <EmptyState icon={faFlask} message="Belum ada lab terdaftar." />
          ) : (
            <ul className="space-y-2">
              {topLabs.map((l, i) => (
                <li key={l.id}>
                  <Link
                    href={`/labs/${l.slug}`}
                    className="flex items-center gap-3 rounded-md p-2 -mx-2 hover:bg-accent/30 transition"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent/15 text-accent-foreground dark:text-accent text-xs font-bold tabular-nums">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{l.name}</div>
                    </div>
                    <div className="text-xs tabular-nums shrink-0 text-muted-foreground">
                      <span className="font-semibold text-foreground">{l._count.courses}</span> course
                      <span className="mx-1">·</span>
                      <span className="font-semibold text-foreground">{l._count.members}</span> anggota
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Tugas Admin" description="Hal yang menunggu tindakan.">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2.5">
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faBoxArchive} className="h-3.5 w-3.5 text-primary" />
                Redemption pending
              </span>
              <Link
                href="/admin/redemptions"
                className="text-xs font-semibold tabular-nums hover:underline"
              >
                {pendingRedemptions}
              </Link>
            </li>
            <li className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2.5">
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faClipboardCheck} className="h-3.5 w-3.5 text-violet-500" />
                Essay belum dinilai
              </span>
              <Link
                href="/proctor/grading"
                className="text-xs font-semibold tabular-nums hover:underline"
              >
                {pendingEssays}
              </Link>
            </li>
            <li className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-2.5">
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5 text-emerald-500" />
                Sesi ujian aktif
              </span>
              <Link
                href="/proctor/sessions"
                className="text-xs font-semibold tabular-nums hover:underline"
              >
                {activeExams}
              </Link>
            </li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Penukaran Terbaru"
          description="5 redemption terakhir."
          className="lg:col-span-2"
          action={
            <Link
              href="/admin/redemptions"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Kelola <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
            </Link>
          }
        >
          {recentRedemptions.length === 0 ? (
            <EmptyState icon={faCircleCheck} message="Belum ada penukaran." />
          ) : (
            <ul className="divide-y">
              {recentRedemptions.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.user.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {r.merchItem.name} · {r.pointsSpent} poin
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] text-muted-foreground">
                      {formatDate(r.redeemedAt)}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                      {r.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
