import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatPoints } from "@/lib/utils";

const TOR_VARIANTS: Record<string, "outline" | "info" | "success" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "destructive",
};

const PROJECT_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "Berjalan",
  REVIEW: "Review",
  DONE: "Selesai",
};

export default async function LabOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lab = await prisma.lab.findUnique({ where: { slug }, select: { id: true } });
  if (!lab) notFound();

  const [tors, projects] = await Promise.all([
    prisma.tor.findMany({
      where: { labId: lab.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.project.findMany({
      where: { labId: lab.id },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const projectByStatus = projects.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const usedBudget = projects.reduce((s, p) => s + p.budgetUsed, 0);
  const budgetPct = totalBudget === 0 ? 0 : Math.round((usedBudget / totalBudget) * 100);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Penyerapan anggaran proker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">Rp {formatPoints(usedBudget)}</div>
              <div className="text-xs text-muted-foreground">dari total Rp {formatPoints(totalBudget)}</div>
            </div>
            <Badge variant={budgetPct > 90 ? "destructive" : budgetPct > 70 ? "warning" : "info"}>
              {budgetPct}% terpakai
            </Badge>
          </div>
          <Progress value={budgetPct} indicatorClassName={budgetPct > 90 ? "bg-destructive" : budgetPct > 70 ? "bg-amber-500" : ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status proker</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(projectByStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada proker.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const).map((s) => (
                <li key={s} className="flex items-center justify-between">
                  <span>{PROJECT_LABEL[s]}</span>
                  <Badge variant="outline">{projectByStatus[s] ?? 0}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TOR terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {tors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada TOR.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {tors.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{t.title}</span>
                  <Badge variant={TOR_VARIANTS[t.status]}>{t.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
