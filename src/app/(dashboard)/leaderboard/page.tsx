import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLeaderboard, type Timeframe } from "@/lib/leaderboard";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatPoints } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCrown, faMedal, faTrophy, faCoins } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Leaderboard" };

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "weekly", label: "Minggu ini" },
  { id: "monthly", label: "Bulan ini" },
  { id: "all", label: "All-time" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tf?: string; lab?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  const { tf, lab } = await searchParams;
  const timeframe: Timeframe = (TIMEFRAMES.find((t) => t.id === tf)?.id ?? "weekly") as Timeframe;

  const labs = await prisma.lab.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } });
  const selectedLab = lab ? labs.find((l) => l.slug === lab) : null;

  const rows = await getLeaderboard({ timeframe, labId: selectedLab?.id ?? null, limit: 50 });
  const myRank = rows.findIndex((r) => r.userId === session.user.id);

  function buildHref(opts: { tf?: Timeframe; lab?: string | null }) {
    const usp = new URLSearchParams();
    const newTf = opts.tf ?? timeframe;
    if (newTf !== "weekly") usp.set("tf", newTf);
    const newLab = opts.lab !== undefined ? opts.lab : selectedLab?.slug ?? null;
    if (newLab) usp.set("lab", newLab);
    const qs = usp.toString();
    return qs ? `/leaderboard?${qs}` : "/leaderboard";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedLab ? `Peringkat di ${selectedLab.name}` : "Peringkat global semua mahasiswa Fasilkom Unsri"} ·{" "}
            {TIMEFRAMES.find((t) => t.id === timeframe)?.label}
          </p>
        </div>
        {myRank >= 0 && (
          <Badge variant="info" className="text-xs">
            Posisi kamu: #{myRank + 1}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Periode:</span>
        {TIMEFRAMES.map((t) => (
          <Link
            key={t.id}
            href={buildHref({ tf: t.id })}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
              timeframe === t.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Scope:</span>
        <Link
          href={buildHref({ lab: null })}
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
            !selectedLab ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
          }`}
        >
          Global
        </Link>
        {labs.map((l) => (
          <Link
            key={l.id}
            href={buildHref({ lab: l.slug })}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
              selectedLab?.id === l.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
            }`}
          >
            {l.name}
          </Link>
        ))}
      </div>

      {/* Top 3 podium */}
      {rows.length >= 1 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Podium row={rows[1]} rank={2} icon={faMedal} accent="silver" />
          <Podium row={rows[0]} rank={1} icon={faCrown} accent="gold" highlight />
          <Podium row={rows[2]} rank={3} icon={faTrophy} accent="bronze" />
        </div>
      )}

      {/* Full table */}
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Belum ada aktivitas pada periode ini.
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map((r, idx) => {
                const me = r.userId === session.user.id;
                const initials = r.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <li
                    key={r.userId}
                    className={`flex items-center gap-3 px-5 py-3 ${me ? "bg-primary/5" : ""}`}
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold tabular-nums ${
                        idx === 0
                          ? "bg-amber-500 text-white"
                          : idx === 1
                            ? "bg-zinc-400 text-white"
                            : idx === 2
                              ? "bg-orange-500 text-white"
                              : "bg-muted"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <Avatar className="h-9 w-9">
                      {r.image && <AvatarImage src={r.image} alt={r.name} />}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {r.name}
                        {me && <Badge variant="info" className="text-[10px]">Kamu</Badge>}
                      </div>
                      {r.prodi && <div className="text-xs text-muted-foreground truncate">{r.prodi}</div>}
                    </div>
                    <div className="font-bold tabular-nums inline-flex items-center gap-1 text-amber-500">
                      <FontAwesomeIcon icon={faCoins} className="h-3 w-3" />
                      {formatPoints(r.points)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Podium({
  row,
  rank,
  icon,
  accent,
  highlight,
}: {
  row?: { userId: string; name: string; image: string | null; prodi: string | null; points: number };
  rank: 1 | 2 | 3;
  icon: typeof faCrown;
  accent: "gold" | "silver" | "bronze";
  highlight?: boolean;
}) {
  if (!row) return <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">—</div>;
  const tints: Record<string, string> = {
    gold: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    silver: "bg-zinc-400/15 text-zinc-700 dark:text-zinc-300",
    bronze: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  };
  const initials = row.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Card className={highlight ? "ring-2 ring-amber-500" : ""}>
      <CardContent className="p-5 text-center space-y-2">
        <div className={`mx-auto grid h-10 w-10 place-items-center rounded-full ${tints[accent]}`}>
          <FontAwesomeIcon icon={icon} className="h-4 w-4" />
        </div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">#{rank}</div>
        <Avatar className="mx-auto h-12 w-12">
          {row.image && <AvatarImage src={row.image} alt={row.name} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="font-semibold truncate">{row.name}</div>
        <div className="font-bold text-amber-500">
          <FontAwesomeIcon icon={faCoins} className="h-3 w-3 mr-1" />
          {formatPoints(row.points)}
        </div>
      </CardContent>
    </Card>
  );
}
