import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPoints, formatDate } from "@/lib/utils";
import {
  faCoins,
  faGraduationCap,
  faMedal,
  faCertificate,
  faRankingStar,
  faArrowRight,
  faBookOpen,
  faClock,
  faShieldHalved,
  faGift,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { StatCard, SectionCard, ProgressBar, EmptyState, Greeting } from "./_primitives";

export default async function MahasiswaDashboard() {
  const session = await auth();
  if (!session) return null;
  const userId = session.user.id;

  const [enrollments, badgesCount, certsCount, inProgress, recentBadges, upcomingExams, ledger, rankAgg] =
    await Promise.all([
      prisma.enrollment.count({ where: { userId } }),
      prisma.userBadge.count({ where: { userId } }),
      prisma.certificate.count({ where: { userId } }),
      prisma.enrollment.findMany({
        where: { userId, completedAt: null },
        orderBy: { enrolledAt: "desc" },
        take: 4,
        include: { course: { select: { slug: true, title: true, lab: { select: { name: true } } } } },
      }),
      prisma.userBadge.findMany({
        where: { userId },
        orderBy: { awardedAt: "desc" },
        take: 4,
        include: { badge: { select: { name: true, iconClass: true } } },
      }),
      prisma.examSession.findMany({
        where: { userId, status: { in: ["SCHEDULED", "ACTIVE"] } },
        orderBy: { endsAt: "asc" },
        take: 3,
        include: { quiz: { select: { title: true } } },
      }),
      prisma.pointsLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.user.count({ where: { points: { gt: session.user.points }, isActive: true } }),
    ]);

  const rank = rankAgg + 1;

  return (
    <div className="space-y-6">
      <Greeting
        name={session.user.name}
        subtitle="Selamat datang kembali. Lanjutkan progres pelatihanmu di bawah ini."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Poin"
          value={formatPoints(session.user.points)}
          hint={`Peringkat #${rank}`}
          icon={faCoins}
          accent="gold"
        />
        <StatCard label="Course Diikuti" value={enrollments} icon={faGraduationCap} accent="sky" />
        <StatCard label="Badge Diraih" value={badgesCount} icon={faMedal} accent="violet" />
        <StatCard label="Sertifikat" value={certsCount} icon={faCertificate} accent="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Course Berjalan"
          description="Lanjutkan dari yang terakhir kamu kerjakan."
          className="lg:col-span-2"
          action={
            <Link
              href="/my/courses"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Lihat semua <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
            </Link>
          }
        >
          {inProgress.length === 0 ? (
            <EmptyState icon={faBookOpen} message="Belum ada course berjalan. Jelajahi katalog!" />
          ) : (
            <ul className="space-y-3">
              {inProgress.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/courses/${e.course.slug}`}
                    className="flex items-center gap-3 rounded-md p-2 -mx-2 hover:bg-accent/30 transition"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <FontAwesomeIcon icon={faBookOpen} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{e.course.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{e.course.lab.name}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <ProgressBar value={e.progressPct} />
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {e.progressPct}%
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Peringkat Kamu"
          description="Posisi di leaderboard global."
          action={
            <Link
              href="/leaderboard"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Detail <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
            </Link>
          }
        >
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              <FontAwesomeIcon icon={faRankingStar} className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="text-3xl font-bold tabular-nums leading-none">#{rank}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatPoints(session.user.points)} poin
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Ujian Mendatang"
          description="Sesi ujian terjadwal & aktif."
          action={
            upcomingExams.length > 0 ? (
              <Link
                href="/my/courses"
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                Buka <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
              </Link>
            ) : null
          }
        >
          {upcomingExams.length === 0 ? (
            <EmptyState icon={faShieldHalved} message="Tidak ada ujian terjadwal." />
          ) : (
            <ul className="space-y-2">
              {upcomingExams.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start gap-2 rounded-md border bg-muted/30 p-2.5 text-sm"
                >
                  <FontAwesomeIcon
                    icon={faShieldHalved}
                    className="h-3.5 w-3.5 mt-0.5 text-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.quiz.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      <span
                        className={
                          s.status === "ACTIVE"
                            ? "font-semibold text-emerald-600 dark:text-emerald-400"
                            : ""
                        }
                      >
                        {s.status}
                      </span>
                      {s.endsAt ? ` · berakhir ${formatDate(s.endsAt)}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Badge Terbaru" description="4 pencapaian terakhirmu.">
          {recentBadges.length === 0 ? (
            <EmptyState icon={faMedal} message="Belum ada badge. Selesaikan course untuk mulai!" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {recentBadges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-md border bg-muted/30 p-2"
                  title={b.badge.name}
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent/20 text-accent-foreground dark:text-accent">
                    <FontAwesomeIcon icon={faMedal} className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-xs font-medium truncate">{b.badge.name}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Aktivitas Poin" description="5 transaksi terakhir.">
          {ledger.length === 0 ? (
            <EmptyState icon={faGift} message="Belum ada aktivitas poin." />
          ) : (
            <ul className="space-y-1.5">
              {ledger.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0 flex items-center gap-2">
                    <FontAwesomeIcon
                      icon={faClock}
                      className="h-3 w-3 text-muted-foreground shrink-0"
                    />
                    <span className="text-xs truncate">{l.reason ?? l.event}</span>
                  </div>
                  <span
                    className={`text-xs font-semibold tabular-nums shrink-0 ${
                      l.delta >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {l.delta >= 0 ? "+" : ""}
                    {formatPoints(l.delta)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
