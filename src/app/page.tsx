import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGraduationCap,
  faMedal,
  faCertificate,
  faShieldHalved,
  faCalendarDays,
  faLocationDot,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPoints } from "@/lib/utils";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  const now = new Date();
  const upcomingEvents = await prisma.event.findMany({
    where: {
      isPublic: true,
      status: { in: ["PUBLISHED", "ONGOING"] },
      endsAt: { gte: now },
    },
    orderBy: { startsAt: "asc" },
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      location: true,
      startsAt: true,
      pointReward: true,
    },
  });

  return (
    <div className="relative flex min-h-[100svh] w-full max-w-[100vw] flex-col overflow-x-hidden bg-background">
      {/* IT theme backdrop: circuit grid + radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-circuit opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-tech-glow" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px tech-scan" />

      <header className="container relative flex w-full items-center justify-between gap-2 py-3 sm:py-4 md:py-5">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Image
            src="/logo.png"
            alt="UTC NextGen — Unsri Training Center"
            width={1980}
            height={780}
            priority
            sizes="(max-width: 480px) 110px, (max-width: 640px) 140px, (max-width: 1024px) 180px, 220px"
            className="h-7 sm:h-9 md:h-12 w-auto logo-adaptive"
          />
        </Link>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs sm:h-10 sm:px-4 sm:text-sm" asChild>
            <Link href="/login">Masuk</Link>
          </Button>
          <Button size="sm" className="tech-glow h-8 px-2.5 text-xs sm:h-10 sm:px-4 sm:text-sm" asChild>
            <Link href="/register">
              {/* Shorter label on tiny screens */}
              <span className="sm:hidden">Daftar</span>
              <span className="hidden sm:inline">Daftar gratis</span>
            </Link>
          </Button>
        </nav>
      </header>

      <section className="container relative flex flex-1 flex-col items-center justify-center gap-0 py-6 text-center sm:py-10 md:py-14">
        <div className="flex w-full min-w-0 max-w-2xl flex-col items-center">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-primary sm:text-[11px]">
            <span className="truncate">Unsri Training Center · Fasilkom</span>
          </div>

          <h1 className="mt-3 text-balance text-[clamp(1.5rem,7vw,3rem)] font-bold leading-tight tracking-tight sm:mt-4 md:text-5xl">
            Training Center Terpusat untuk{" "}
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              8 Lab Fasilkom Unsri
            </span>
          </h1>

          <p className="mt-3 max-w-prose text-pretty text-[13px] text-muted-foreground sm:mt-5 sm:text-base md:text-lg">
            Kumpulkan poin, raih badge, lulus ujian, dapatkan sertifikat resmi. Satu sistem untuk semua aktivitas
            pelatihan laboratorium.
          </p>

          <div className="mt-5 flex w-full flex-col gap-2.5 sm:mt-8 sm:flex-row sm:justify-center sm:gap-3">
            <Button size="lg" asChild className="tech-glow h-11 w-full text-sm sm:w-auto sm:text-base">
              <Link href="/register">
                <FontAwesomeIcon icon={faGraduationCap} /> Mulai belajar (+100 poin)
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 w-full text-sm sm:w-auto sm:text-base">
              <Link href="/login">Sudah punya akun? Masuk</Link>
            </Button>
          </div>
        </div>

        {/* Marquee: full-bleed, clipped to viewport. min-w-0 lets it shrink instead of expanding parent. */}
        <div className="relative mt-10 w-full min-w-0 max-w-[100vw] overflow-hidden sm:mt-14">
          {/* Edge blur overlays — narrower on small screens */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 backdrop-blur-md sm:w-20 [mask-image:linear-gradient(to_right,#000,transparent)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 backdrop-blur-md sm:w-20 [mask-image:linear-gradient(to_left,#000,transparent)]" />

          <div className="marquee overflow-hidden py-4 sm:py-6">
            {/*
              Seamless loop math:
              - Track is a single flat flex row of 2× cards (8 total) with a uniform gap.
              - Trailing padding-right == gap → total track width = 8·card + 8·gap.
              - Animation translates 0 → -50% (= 4·card + 4·gap), placing card #5 (the
                duplicate of card #1) exactly where card #1 started. No visual jump.
            */}
            <div className="marquee-track flex items-center gap-3 pr-3 sm:gap-5 sm:pr-5">
              {[
                { icon: faGraduationCap, title: "LMS Bertingkat",   desc: "Quiz wajib per section sebelum lanjut.",       delay: "0s" },
                { icon: faShieldHalved,  title: "Ujian Diawasi",    desc: "Anti-cheating real-time oleh proktor.",        delay: "-1.75s" },
                { icon: faMedal,         title: "Gamifikasi",       desc: "Poin, badge, dan leaderboard kompetitif.",     delay: "-3.5s" },
                { icon: faCertificate,   title: "Sertifikat Resmi", desc: "PDF + QR code, verifikasi publik.",            delay: "-5.25s" },
                // duplicate set — flat (NOT wrapped) so all gaps are identical
                { icon: faGraduationCap, title: "LMS Bertingkat",   desc: "Quiz wajib per section sebelum lanjut.",       delay: "0s",     dup: true },
                { icon: faShieldHalved,  title: "Ujian Diawasi",    desc: "Anti-cheating real-time oleh proktor.",        delay: "-1.75s", dup: true },
                { icon: faMedal,         title: "Gamifikasi",       desc: "Poin, badge, dan leaderboard kompetitif.",     delay: "-3.5s",  dup: true },
                { icon: faCertificate,   title: "Sertifikat Resmi", desc: "PDF + QR code, verifikasi publik.",            delay: "-5.25s", dup: true },
              ].map((c, i) => (
                <Feature
                  key={i}
                  icon={c.icon}
                  title={c.title}
                  desc={c.desc}
                  delay={c.delay}
                  ariaHidden={c.dup}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {upcomingEvents.length > 0 && (
        <section className="container relative w-full py-8 sm:py-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex items-end justify-between gap-3 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent sm:text-[11px]">
                  <FontAwesomeIcon icon={faCalendarDays} className="h-3 w-3" />
                  Event & Kampanye
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                  Acara terdekat di Fasilkom
                </h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Hadiri event aktif dan dapatkan poin tambahan untuk ditukar dengan merchandise.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Lihat semua event</Link>
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {upcomingEvents.map((e) => (
                <Link
                  key={e.id}
                  href="/login"
                  className="group rounded-xl border border-primary/10 bg-card p-4 transition hover:border-primary/40 hover:shadow-md hover:shadow-primary/10"
                >
                  <h3 className="font-semibold leading-tight group-hover:text-primary line-clamp-2">
                    {e.title}
                  </h3>
                  {e.description && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{e.description}</p>
                  )}
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faCalendarDays} className="h-3 w-3" />
                      {formatDate(e.startsAt)}
                    </div>
                    {e.location && (
                      <div className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3" />
                        {e.location}
                      </div>
                    )}
                    {e.pointReward > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-500">
                        <FontAwesomeIcon icon={faCoins} className="h-3 w-3" />
                        +{formatPoints(e.pointReward)} poin untuk peserta
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="container relative border-t border-primary/10 py-5 text-center text-[11px] text-muted-foreground sm:py-6 sm:text-xs">
        © {new Date().getFullYear()} UTC NextGen — Fakultas Ilmu Komputer Universitas Sriwijaya.
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
  delay = "0s",
  ariaHidden = false,
}: {
  icon: IconDefinition;
  title: string;
  desc: string;
  delay?: string;
  ariaHidden?: boolean;
}) {
  return (
    <div
      aria-hidden={ariaHidden}
      style={{ animationDelay: delay }}
      className="marquee-card group relative w-[170px] shrink-0 overflow-hidden rounded-xl border border-primary/10 bg-card px-3 py-3 text-center transition-shadow duration-300 hover:!scale-110 hover:!opacity-100 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/15 sm:w-[220px] sm:px-4 sm:py-3.5 md:w-[260px]"
    >
      {/* Top accent strip (gold) — appears on hover */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {/* Soft radial glow on hover */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/.08),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Centered icon with concentric ring */}
      <div className="relative mx-auto flex h-10 w-10 items-center justify-center sm:h-12 sm:w-12">
        <div className="absolute inset-0 rounded-full border border-primary/15 transition-all duration-300 group-hover:border-primary/40 group-hover:scale-110" />
        <div className="absolute inset-1 rounded-full border border-primary/10 transition-all duration-300 group-hover:border-accent/30" />
        <div className="relative grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:shadow-md group-hover:shadow-primary/30 sm:h-9 sm:w-9">
          <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </div>

      <h3 className="mt-2 text-[12px] font-semibold tracking-tight transition-colors group-hover:text-primary sm:mt-2.5 sm:text-sm">
        {title}
      </h3>
      <div className="mx-auto mt-1 h-px w-5 bg-gradient-to-r from-transparent via-accent/60 to-transparent transition-all duration-300 group-hover:w-9 sm:w-6 sm:group-hover:w-10" />
      <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground line-clamp-2 sm:mt-1.5 sm:text-xs">{desc}</p>
    </div>
  );
}
