import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faGraduationCap, faMedal, faCertificate, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      {/* IT theme backdrop: circuit grid + radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-circuit opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-tech-glow" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px tech-scan" />

      <header className="container relative flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="UTC NextGen — Unsri Training Center"
            width={1980}
            height={780}
            priority
            className="h-10 md:h-12 w-auto"
          />
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild className="tech-glow">
            <Link href="/register">Daftar gratis</Link>
          </Button>
        </div>
      </header>

      <section className="container relative flex-1 grid place-items-center text-center py-14">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
            <FontAwesomeIcon icon={faBolt} className="h-3 w-3 text-accent" />
            Unsri Training Center · Fasilkom
          </div>
          <h1 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight">
            Training Center Terpusat untuk{" "}
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              8 Lab Fasilkom Unsri
            </span>
          </h1>
          <p className="mt-5 text-muted-foreground md:text-lg">
            Kumpulkan poin, raih badge, lulus ujian, dapatkan sertifikat resmi. Satu sistem untuk semua aktivitas
            pelatihan laboratorium.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="tech-glow">
              <Link href="/register">
                <FontAwesomeIcon icon={faGraduationCap} /> Mulai belajar (+100 poin)
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sudah punya akun? Masuk</Link>
            </Button>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
            <Feature icon={faGraduationCap} title="LMS Bertingkat" desc="Quiz wajib per section sebelum lanjut." />
            <Feature icon={faShieldHalved} title="Ujian Diawasi" desc="Anti-cheating real-time oleh proktor." />
            <Feature icon={faMedal} title="Gamifikasi" desc="Poin, badge, dan leaderboard kompetitif." />
            <Feature icon={faCertificate} title="Sertifikat Resmi" desc="PDF + QR code, verifikasi publik." />
          </div>
        </div>
      </section>

      <footer className="container relative py-6 text-center text-xs text-muted-foreground border-t border-primary/10">
        © {new Date().getFullYear()} UTC NextGen — Fakultas Ilmu Komputer Universitas Sriwijaya.
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: typeof faBolt; title: string; desc: string }) {
  return (
    <div className="group relative rounded-lg border border-primary/10 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <FontAwesomeIcon icon={icon} className="h-4 w-4" />
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      <div className="absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
