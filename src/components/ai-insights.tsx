"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBrain,
  faWandMagicSparkles,
  faTriangleExclamation,
  faStar,
  faBullseye,
  faUserTie,
  faGraduationCap,
} from "@fortawesome/free-solid-svg-icons";
import type { Insights } from "@/lib/ai-analyst";

export function AIInsights() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Insights | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/analytics/ai-insights", { method: "POST" });
      const json = await r.json();
      if (!r.ok) {
        setError(json?.error ?? "Gagal menjalankan analisis.");
        return;
      }
      setData(json.insights as Insights);
    } catch {
      setError("Gagal menjalankan analisis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FontAwesomeIcon icon={faBrain} className="h-4 w-4 text-violet-500" />
            Analisa AI — rekomendasi untuk manajer lab
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Berdasarkan agregat enrollment, sertifikasi, dan hasil ujian — tanpa mengirim PII mahasiswa.
          </p>
        </div>
        <Button size="sm" onClick={run} disabled={loading} variant={data ? "outline" : "default"}>
          <FontAwesomeIcon icon={faWandMagicSparkles} className={loading ? "animate-pulse" : ""} />
          {loading ? "Menganalisa…" : data ? "Jalankan ulang" : "Jalankan analisa"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
            {error}
          </div>
        )}
        {!data && !error && !loading && (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Belum ada analisis. Klik <strong>Jalankan analisa</strong> untuk meminta Claude menelaah data UTC dan
            memberikan rekomendasi program prioritas, saran operasional manajer lab, dan saran terkait IKU kampus.
          </div>
        )}
        {loading && !data && (
          <div className="space-y-5">
            <Skeleton className="h-16 w-full rounded-md" />
            {Array.from({ length: 3 }).map((_, s) => (
              <div key={s} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-3.5 w-48" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-md border p-3 space-y-2">
                      <Skeleton className="h-3 w-2/5" />
                      <Skeleton className="h-2.5 w-4/5" />
                      <Skeleton className="h-2.5 w-3/5" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {data && (
          <>
            <div className="rounded-md bg-violet-500/5 p-4 text-sm leading-relaxed">{data.ringkasan}</div>

            <Section icon={faBullseye} title="Program prioritas (butuh intervensi)" tint="rose">
              {data.programPrioritas.map((p, i) => (
                <Item key={i} title={p.course} subtitle={p.alasan} action={p.tindakan} actionLabel="Tindakan" />
              ))}
            </Section>

            <Section icon={faStar} title="Program unggulan (scale up)" tint="emerald">
              {data.programUnggulan.map((p, i) => (
                <Item key={i} title={p.course} subtitle={p.alasan} action={p.scaleUp} actionLabel="Scale-up" />
              ))}
            </Section>

            <Section icon={faUserTie} title="Saran untuk manajer lab" tint="sky">
              {data.sarManajerLab.map((s, i) => (
                <div key={i} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="info" className="text-[10px] uppercase">
                      {s.kategori}
                    </Badge>
                    <span className="font-medium">{s.saran}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Dampak: {s.dampak}</div>
                </div>
              ))}
            </Section>

            <Section icon={faGraduationCap} title="Saran untuk pencapaian IKU kampus" tint="violet">
              {data.sarIKU.map((s, i) => (
                <div key={i} className="rounded-md border p-3 text-sm">
                  <Badge variant="default" className="text-[10px]">
                    {s.iku}
                  </Badge>
                  <div className="mt-1.5">{s.saran}</div>
                </div>
              ))}
            </Section>

            {data.risikoPerhatian.length > 0 && (
              <Section icon={faTriangleExclamation} title="Risiko & perhatian" tint="amber">
                <ul className="space-y-1.5 text-sm">
                  {data.risikoPerhatian.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <p className="text-[10px] text-muted-foreground">
              Analisis dihasilkan oleh model Claude — tetap verifikasi sebelum eksekusi. Hasil bisa berbeda tiap
              run karena data terus diperbarui.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  icon,
  title,
  tint,
  children,
}: {
  icon: typeof faStar;
  title: string;
  tint: "rose" | "emerald" | "sky" | "violet" | "amber";
  children: React.ReactNode;
}) {
  const tints: Record<string, string> = {
    rose: "text-rose-500",
    emerald: "text-emerald-500",
    sky: "text-sky-500",
    violet: "text-violet-500",
    amber: "text-amber-500",
  };
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <FontAwesomeIcon icon={icon} className={`h-3.5 w-3.5 ${tints[tint]}`} />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({
  title,
  subtitle,
  action,
  actionLabel,
}: {
  title: string;
  subtitle: string;
  action: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      <div className="mt-2 text-xs">
        <span className="font-semibold">{actionLabel}: </span>
        {action}
      </div>
    </div>
  );
}
