import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { formatDate, formatPoints } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMedal } from "@fortawesome/free-solid-svg-icons";

const POINT_LABEL: Record<string, string> = {
  REGISTER: "Pendaftaran",
  DAILY_LOGIN: "Login harian",
  LESSON_COMPLETE: "Selesaikan lesson",
  QUIZ_PASS: "Lulus quiz",
  EXAM_PASS: "Lulus ujian",
  CERT_EARNED: "Dapat sertifikat",
  COURSE_UNLOCK: "Buka course",
  MERCH_REDEEM: "Tukar merchandise",
  ADMIN_ADJUST: "Penyesuaian admin",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session) return null;

  const [user, ledger, badges] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.pointsLedger.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.userBadge.findMany({
      where: { userId: session.user.id },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Data diri</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              name: user.name,
              email: user.email,
              nim: user.nim ?? "",
              prodi: user.prodi ?? "",
              angkatan: user.angkatan ?? new Date().getFullYear(),
              image: user.image ?? "",
            }}
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Total poin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{formatPoints(user.points)}</div>
            <p className="text-xs text-muted-foreground mt-1">poin terkumpul sejak {formatDate(user.createdAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badge</CardTitle>
          </CardHeader>
          <CardContent>
            {badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada badge.</p>
            ) : (
              <ul className="space-y-2">
                {badges.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 text-sm">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <FontAwesomeIcon icon={faMedal} className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-medium">{b.badge.name}</div>
                      <div className="text-xs text-muted-foreground">{b.badge.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Riwayat poin</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas poin.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-3">Waktu</th>
                    <th className="text-left py-2 pr-3">Aktivitas</th>
                    <th className="text-left py-2 pr-3">Catatan</th>
                    <th className="text-right py-2">Poin</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-muted-foreground">{formatDate(row.createdAt)}</td>
                      <td className="py-2 pr-3">{POINT_LABEL[row.event] ?? row.event}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.reason ?? "—"}</td>
                      <td
                        className={`py-2 text-right font-medium ${row.delta >= 0 ? "text-emerald-500" : "text-destructive"}`}
                      >
                        {row.delta >= 0 ? "+" : ""}
                        {formatPoints(row.delta)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
