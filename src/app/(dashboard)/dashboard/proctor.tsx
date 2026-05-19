import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  faShieldHalved,
  faClipboardCheck,
  faTriangleExclamation,
  faArrowRight,
  faPlay,
  faClock,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { StatCard, SectionCard, EmptyState, Greeting } from "./_primitives";

export default async function ProctorDashboard() {
  const session = await auth();
  if (!session) return null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [activeCount, todayCount, pendingEssayCount, violationCount, activeSessions, scheduledSessions, todayDone] =
    await Promise.all([
      prisma.examSession.count({ where: { status: "ACTIVE" } }),
      prisma.examSession.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.answerSubmission.count({
        where: {
          essayText: { not: null },
          isCorrect: null,
          attempt: { status: "SUBMITTED" },
        },
      }),
      prisma.examViolation.count({ where: { occurredAt: { gte: startOfDay } } }),
      prisma.examSession.findMany({
        where: { status: "ACTIVE" },
        orderBy: { endsAt: "asc" },
        take: 6,
        include: {
          user: { select: { name: true, nim: true } },
          quiz: { select: { title: true } },
        },
      }),
      prisma.examSession.findMany({
        where: { status: "SCHEDULED" },
        orderBy: { createdAt: "asc" },
        take: 5,
        include: {
          user: { select: { name: true } },
          quiz: { select: { title: true } },
        },
      }),
      prisma.examSession.count({
        where: { status: { in: ["SUBMITTED", "FORCE_ENDED", "EXPIRED"] }, submittedAt: { gte: startOfDay } },
      }),
    ]);

  return (
    <div className="space-y-6">
      <Greeting
        name={session.user.name}
        subtitle="Pantau sesi ujian aktif dan kelola penilaian essay."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sesi Aktif"
          value={activeCount}
          hint="Sedang berlangsung"
          icon={faShieldHalved}
          accent="emerald"
        />
        <StatCard
          label="Sesi Hari Ini"
          value={todayCount}
          hint={`${todayDone} selesai`}
          icon={faPlay}
          accent="primary"
        />
        <StatCard
          label="Essay Belum Dinilai"
          value={pendingEssayCount}
          icon={faClipboardCheck}
          accent="violet"
        />
        <StatCard
          label="Pelanggaran Hari Ini"
          value={violationCount}
          icon={faTriangleExclamation}
          accent="rose"
        />
      </div>

      <SectionCard
        title="Sesi Ujian Aktif"
        description="Mahasiswa yang sedang mengerjakan ujian saat ini."
        action={
          <Link
            href="/proctor/sessions"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            Semua sesi <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
          </Link>
        }
      >
        {activeSessions.length === 0 ? (
          <EmptyState icon={faCircleCheck} message="Tidak ada sesi ujian yang sedang berjalan." />
        ) : (
          <ul className="divide-y">
            {activeSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex items-center gap-3">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
                    <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{s.user.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {s.quiz.title}
                      {s.user.nim ? ` · ${s.user.nim}` : ""}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] text-muted-foreground">
                    {s.endsAt ? `s/d ${formatDate(s.endsAt)}` : "—"}
                  </div>
                  {s.violationCount > 0 ? (
                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      {s.violationCount} pelanggaran
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Sesi Terjadwal"
          description="Ujian yang akan datang."
        >
          {scheduledSessions.length === 0 ? (
            <EmptyState icon={faClock} message="Tidak ada sesi terjadwal." />
          ) : (
            <ul className="space-y-2">
              {scheduledSessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-md border bg-muted/30 p-2.5 text-sm"
                >
                  <FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{s.user.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{s.quiz.title}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Penilaian Essay"
          description="Antrian essay menunggu penilaian."
          action={
            pendingEssayCount > 0 ? (
              <Link
                href="/proctor/grading"
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                Mulai nilai <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
              </Link>
            ) : null
          }
        >
          {pendingEssayCount === 0 ? (
            <EmptyState icon={faCircleCheck} message="Semua essay sudah dinilai. Mantap!" />
          ) : (
            <div className="flex items-center gap-4 py-2">
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <FontAwesomeIcon icon={faClipboardCheck} className="h-7 w-7" />
              </div>
              <div>
                <div className="text-3xl font-bold tabular-nums leading-none">
                  {pendingEssayCount}
                </div>
                <div className="text-xs text-muted-foreground mt-1">essay menunggu</div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
