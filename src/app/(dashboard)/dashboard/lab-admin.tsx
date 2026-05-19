import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  faFlask,
  faUsers,
  faGraduationCap,
  faClipboardList,
  faArrowRight,
  faBoxArchive,
  faChartLine,
  faCircleCheck,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { StatCard, SectionCard, EmptyState, Greeting } from "./_primitives";

export default async function LabAdminDashboard() {
  const session = await auth();
  if (!session) return null;
  const userId = session.user.id;

  const managedLabs = await prisma.lab.findMany({
    where: { adminId: userId },
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });
  const labIds = managedLabs.map((l) => l.id);

  const [memberCount, courseCount, activeEnrollCount, pendingRedemptions, topCourses, recentEnrolls, pendingTors] =
    await Promise.all([
      prisma.labMember.count({ where: { labId: { in: labIds } } }),
      prisma.course.count({ where: { labId: { in: labIds } } }),
      prisma.enrollment.count({
        where: { course: { labId: { in: labIds } }, completedAt: null },
      }),
      prisma.merchRedemption.count({ where: { status: "PENDING" } }),
      prisma.course.findMany({
        where: { labId: { in: labIds } },
        orderBy: { enrollments: { _count: "desc" } },
        take: 5,
        select: {
          id: true,
          slug: true,
          title: true,
          lab: { select: { name: true } },
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.enrollment.findMany({
        where: { course: { labId: { in: labIds } } },
        orderBy: { enrolledAt: "desc" },
        take: 5,
        include: {
          user: { select: { name: true } },
          course: { select: { slug: true, title: true } },
        },
      }),
      prisma.tor.findMany({
        where: { labId: { in: labIds }, status: "SUBMITTED" },
        orderBy: { updatedAt: "desc" },
        take: 4,
        include: { lab: { select: { name: true, slug: true } } },
      }),
    ]);

  return (
    <div className="space-y-6">
      <Greeting
        name={session.user.name}
        subtitle={`Mengelola ${managedLabs.length} lab. Ringkasan operasional di bawah ini.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Lab Dikelola"
          value={managedLabs.length}
          icon={faFlask}
          accent="primary"
        />
        <StatCard label="Total Anggota" value={memberCount} icon={faUsers} accent="sky" />
        <StatCard label="Course" value={courseCount} icon={faGraduationCap} accent="violet" />
        <StatCard
          label="Enrollment Aktif"
          value={activeEnrollCount}
          hint={pendingRedemptions > 0 ? `${pendingRedemptions} redemption menunggu` : undefined}
          icon={faChartLine}
          accent="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Lab Kamu"
          description="Lab yang kamu kelola sebagai admin."
          className="lg:col-span-1"
        >
          {managedLabs.length === 0 ? (
            <EmptyState icon={faFlask} message="Belum ada lab yang kamu kelola." />
          ) : (
            <ul className="space-y-2">
              {managedLabs.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/labs/${l.slug}`}
                    className="flex items-center gap-2 rounded-md border bg-muted/30 p-2.5 hover:bg-accent/30 transition"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                      <FontAwesomeIcon icon={faFlask} className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium truncate">{l.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Top Course"
          description="Course dengan enrollment terbanyak."
          className="lg:col-span-2"
          action={
            <Link
              href="/courses"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Lihat semua <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
            </Link>
          }
        >
          {topCourses.length === 0 ? (
            <EmptyState icon={faGraduationCap} message="Belum ada course." />
          ) : (
            <ul className="space-y-2">
              {topCourses.map((c, i) => (
                <li key={c.id}>
                  <Link
                    href={`/courses/${c.slug}`}
                    className="flex items-center gap-3 rounded-md p-2 -mx-2 hover:bg-accent/30 transition"
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent/15 text-accent-foreground dark:text-accent text-xs font-bold tabular-nums">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{c.lab.name}</div>
                    </div>
                    <div className="text-xs tabular-nums shrink-0">
                      <span className="font-semibold">{c._count.enrollments}</span>
                      <span className="text-muted-foreground"> enroll</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Enrollment Terbaru"
          description="5 pendaftaran course terakhir."
          action={
            <Link
              href="/analytics"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Analytics <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
            </Link>
          }
        >
          {recentEnrolls.length === 0 ? (
            <EmptyState icon={faUsers} message="Belum ada enrollment terbaru." />
          ) : (
            <ul className="divide-y">
              {recentEnrolls.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.user.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{e.course.title}</div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {formatDate(e.enrolledAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="TOR Menunggu Review"
          description="Term of Reference yang perlu di-approve."
          action={
            pendingTors.length > 0 ? (
              <Link
                href={`/labs/${pendingTors[0].lab.slug}`}
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                Buka <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
              </Link>
            ) : null
          }
        >
          {pendingTors.length === 0 ? (
            <EmptyState icon={faCircleCheck} message="Tidak ada TOR menunggu." />
          ) : (
            <ul className="space-y-2">
              {pendingTors.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-2 rounded-md border bg-muted/30 p-2.5 text-sm"
                >
                  <FontAwesomeIcon
                    icon={faTriangleExclamation}
                    className="h-3.5 w-3.5 mt-0.5 text-amber-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {t.lab.name} · {formatDate(t.updatedAt)}
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
