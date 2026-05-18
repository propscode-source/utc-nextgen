import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faGraduationCap, faMedal, faCertificate } from "@fortawesome/free-solid-svg-icons";
import { prisma } from "@/lib/prisma";
import { formatPoints } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const [enrollments, badges, certs] = await Promise.all([
    prisma.enrollment.count({ where: { userId: session.user.id } }),
    prisma.userBadge.count({ where: { userId: session.user.id } }),
    prisma.certificate.count({ where: { userId: session.user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Halo, {session.user.name.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Selamat datang kembali di <strong>UTC NextGen</strong>. Lanjutkan progres pelatihan kamu di bawah ini.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Poin" value={formatPoints(session.user.points)} icon={faCoins} accent="amber" />
        <StatCard label="Course Diikuti" value={String(enrollments)} icon={faGraduationCap} accent="sky" />
        <StatCard label="Badge Diraih" value={String(badges)} icon={faMedal} accent="violet" />
        <StatCard label="Sertifikat" value={String(certs)} icon={faCertificate} accent="emerald" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roadmap Modul</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Fase 1 (sudah aktif)</strong> — Auth, profil, gamifikasi dasar (poin register & login harian),
            layout dashboard role-based.
          </p>
          <p>
            <strong>Fase 2 selanjutnya</strong> — Lab management (TOR, Proker kanban, aset), Course/LMS, Quiz per
            section, Pretest & Final exam, Proktor real-time, Sertifikat, Analytics, Notifikasi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof faCoins;
  accent: "amber" | "sky" | "violet" | "emerald";
}) {
  const tints: Record<string, string> = {
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-11 w-11 place-items-center rounded-lg ${tints[accent]}`}>
          <FontAwesomeIcon icon={icon} className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
